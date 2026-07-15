class AnswerStorage {
  constructor() {
    this.storageKey = 'met-test-session';
    this.currentSession = this.getSession();
  }

  initSession(studentInfo) {
    const sessionMetadata = {
      studentId: studentInfo.id,
      studentName: studentInfo.name,
      studentEmail: studentInfo.email,
      startTime: new Date().toISOString(),
      completed: false
    };
    sessionStorage.setItem(this.storageKey, JSON.stringify(sessionMetadata));

    const sections = ['writing', 'listening1', 'listening2', 'listening3', 'reading', 'speaking'];
    sections.forEach(section => {
      sessionStorage.setItem(`met-test-answers-${section}`, JSON.stringify([]));
    });

    sessionStorage.setItem('met-test-scores', JSON.stringify({}));

    this.currentSession = this.getSession();
    return this.currentSession;
  }

  getSession() {
    const stored = sessionStorage.getItem(this.storageKey);
    if (!stored) return null;
    const session = JSON.parse(stored);

    session.answers = {};
    const sections = ['writing', 'listening1', 'listening2', 'listening3', 'reading', 'speaking'];
    sections.forEach(section => {
      const sectionKey = `met-test-answers-${section}`;
      const sectionStored = sessionStorage.getItem(sectionKey);
      session.answers[section] = sectionStored ? JSON.parse(sectionStored) : [];
    });

    const scoresStored = sessionStorage.getItem('met-test-scores');
    session.scores = scoresStored ? JSON.parse(scoresStored) : {};

    return session;
  }

  saveAnswer(section, questionId, answer) {
    const stored = sessionStorage.getItem(this.storageKey);
    if (!stored) return false;

    const sectionKey = `met-test-answers-${section}`;
    const sectionStored = sessionStorage.getItem(sectionKey);
    const sectionAnswers = sectionStored ? JSON.parse(sectionStored) : [];

    const existingIdx = sectionAnswers.findIndex(a => a.questionId === questionId);
    if (existingIdx >= 0) {
      sectionAnswers[existingIdx] = { questionId, answer, timestamp: new Date().toISOString() };
    } else {
      sectionAnswers.push({ questionId, answer, timestamp: new Date().toISOString() });
    }

    sessionStorage.setItem(sectionKey, JSON.stringify(sectionAnswers));
    return true;
  }

  saveSectionScore(section, score, total, cefrLevel) {
    const stored = sessionStorage.getItem(this.storageKey);
    if (!stored) return false;

    const scoresStored = sessionStorage.getItem('met-test-scores');
    const scores = scoresStored ? JSON.parse(scoresStored) : {};

    scores[section] = {
      score,
      total,
      percentage: Math.round((score / total) * 100),
      cefrLevel,
      timestamp: new Date().toISOString()
    };

    sessionStorage.setItem('met-test-scores', JSON.stringify(scores));
    return true;
  }

  completeTest() {
    const stored = sessionStorage.getItem(this.storageKey);
    if (!stored) return false;

    const sessionMetadata = JSON.parse(stored);
    sessionMetadata.completed = true;
    sessionMetadata.endTime = new Date().toISOString();
    sessionStorage.setItem(this.storageKey, JSON.stringify(sessionMetadata));
    return true;
  }

  async submitTest() {
    const session = this.getSession();
    if (!session) {
      console.error('No active test session');
      return false;
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (window.MET_AUTH) {
        const authHeaders = await window.MET_AUTH.authHeaders();
        Object.assign(headers, authHeaders);
      }

      const payload = {
        studentId: session.studentId,
        studentName: session.studentName,
        studentEmail: session.studentEmail,
        sessionId: session.sessionId || 'sess_' + Date.now(),
        submittedAt: new Date().toISOString(),
        writingAnswers: JSON.stringify(session.answers.writing || []),
        readingAnswers: JSON.stringify(session.answers.reading || []),
        listeningAnswers: JSON.stringify({
          ...session.answers.listening1,
          ...session.answers.listening2,
          ...session.answers.listening3
        } || {}),
        sectionsCompleted: session.completed ? 'All' : 'Partial'
      };

      const response = await fetch('/.netlify/functions/submit-test', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Test submitted successfully', result);

      this.clearSession();
      return result;
    } catch (error) {
      console.error('Error submitting test:', error);
      return false;
    }
  }

  getAnswers(section) {
    const session = this.getSession();
    if (!session || !session.answers[section]) return [];
    return session.answers[section];
  }

  clearSession() {
    sessionStorage.removeItem(this.storageKey);
    const sections = ['writing', 'listening1', 'listening2', 'listening3', 'reading', 'speaking'];
    sections.forEach(section => {
      sessionStorage.removeItem(`met-test-answers-${section}`);
    });
    sessionStorage.removeItem('met-test-scores');
    this.currentSession = null;
  }
}

window.answerStorage = new AnswerStorage();
