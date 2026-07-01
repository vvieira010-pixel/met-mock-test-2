/**
 * Answer Storage System
 * Manages student test answers and submissions
 */

class AnswerStorage {
  constructor() {
    this.storageKey = 'met-test-session';
    this.currentSession = this.getSession();
  }

  /**
   * Initialize a new test session with student info
   */
  initSession(studentInfo) {
    const session = {
      studentId: studentInfo.id,
      studentName: studentInfo.name,
      studentEmail: studentInfo.email,
      startTime: new Date().toISOString(),
      answers: {
        writing: [],
        listening1: [],
        listening2: [],
        listening3: [],
        reading: [],
        speaking: []
      },
      scores: {},
      completed: false
    };
    sessionStorage.setItem(this.storageKey, JSON.stringify(session));
    this.currentSession = session;
    return session;
  }

  /**
   * Get current session
   */
  getSession() {
    const stored = sessionStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Save answer for a specific question
   */
  saveAnswer(section, questionId, answer) {
    const session = this.getSession();
    if (!session) return false;

    if (!session.answers[section]) {
      session.answers[section] = [];
    }

    const existingIdx = session.answers[section].findIndex(a => a.questionId === questionId);
    if (existingIdx >= 0) {
      session.answers[section][existingIdx] = { questionId, answer, timestamp: new Date().toISOString() };
    } else {
      session.answers[section].push({ questionId, answer, timestamp: new Date().toISOString() });
    }

    sessionStorage.setItem(this.storageKey, JSON.stringify(session));
    return true;
  }

  /**
   * Save section score and CEFR level
   */
  saveSectionScore(section, score, total, cefrLevel) {
    const session = this.getSession();
    if (!session) return false;

    session.scores[section] = {
      score,
      total,
      percentage: Math.round((score / total) * 100),
      cefrLevel,
      timestamp: new Date().toISOString()
    };

    sessionStorage.setItem(this.storageKey, JSON.stringify(session));
    return true;
  }

  /**
   * Mark test as completed
   */
  completeTest() {
    const session = this.getSession();
    if (!session) return false;

    session.completed = true;
    session.endTime = new Date().toISOString();
    sessionStorage.setItem(this.storageKey, JSON.stringify(session));
    return true;
  }

  /**
   * Submit test results to server
   */
  async submitTest() {
    const session = this.getSession();
    if (!session) {
      console.error('No active test session');
      return false;
    }

    try {
      const response = await fetch('/.netlify/functions/submit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Test submitted successfully', result);

      // Clear session after successful submission
      sessionStorage.removeItem(this.storageKey);
      return result;
    } catch (error) {
      console.error('Error submitting test:', error);
      return false;
    }
  }

  /**
   * Get all answers for a section
   */
  getAnswers(section) {
    const session = this.getSession();
    if (!session || !session.answers[section]) return [];
    return session.answers[section];
  }

  /**
   * Clear session (for logout or reset)
   */
  clearSession() {
    sessionStorage.removeItem(this.storageKey);
    this.currentSession = null;
  }
}

// Global instance
window.answerStorage = new AnswerStorage();
