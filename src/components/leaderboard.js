const firebase = require('firebase/app');
const pr = require('profane-words');
require('firebase/firestore');

const NUM_SCORES_DISPLAYED = 10;
const LOCAL_SCORES_KEY = 'moonrider-scores';
const ba = /(fuc)|(ass)|(nig)|(shit)|(retard)/gi;

// TODO! Support beatmapCharacteristic in here

/**
 * High score with Firebase cloud store.
 * Index: challengeId ASC difficulty ASC score DESC time ASC
 */
AFRAME.registerComponent('leaderboard', {
  schema: {
    apiKey: {type: 'string'},
    authDomain: {type: 'string'},
    databaseURL: {type: 'string'},
    projectId: {type: 'string'},
    storageBucket: {type: 'string'},
    messagingSenderId: {type: 'string'},

    challengeId: {default: ''},
    difficulty: {default: ''},
    beatmapCharacteristic: { default: '' },
    inVR: {default: false},
    gameMode: {type: 'string'},
    menuSelectedChallengeId: {default: ''},
    isVictory: {default: false}
  },

  init: function () {
    this.qualifyingIndex = undefined;
    this.scores = [];
    this.eventDetail = {scores: this.scores};
    this.addEventDetail = {scoreData: undefined, index: undefined};

    this.username = localStorage.getItem('moonriderusername') || 'Super Zealot';
    this.el.addEventListener('leaderboardusername', evt => {
      this.username = evt.detail.value;
      localStorage.setItem('moonriderusername', this.username);
    });
    this.el.addEventListener('leaderboardsubmit', this.addScore.bind(this));
  },

  update: function (oldData) {
    // Initialize Cloud Firestore through Firebase.
    if (!firebase.apps.length && this.data.apiKey) {
      firebase.initializeApp({
        apiKey: this.data.apiKey,
        authDomain: this.data.authDomain,
        databaseURL: this.data.databaseURL,
        projectId: this.data.projectId,
        storageBucket: this.data.storageBucket,
        messagingSenderId: this.data.messagingSenderId
      });
      this.firestore = firebase.firestore();
      this.firestore.settings({});
      this.db = this.firestore.collection('scores');
    }

    if (!oldData.isVictory && this.data.isVictory) {
      this.checkLeaderboardQualify();
    }

    if (this.data.difficulty && oldData.difficulty !== this.data.difficulty) {
      this.fetchScores(this.data.menuSelectedChallengeId);
      return;
    }

    if (this.data.menuSelectedChallengeId &&
      oldData.menuSelectedChallengeId !== this.data.menuSelectedChallengeId) {
      this.fetchScores(this.data.menuSelectedChallengeId);
      return;
    }

    if (this.data.challengeId && oldData.challengeId !== this.data.challengeId) {
      this.fetchScores(this.data.challengeId);
      return;
    }
  },

  addScore: function () {
    const state = this.el.sceneEl.systems.state.state;

    if (!state.isVictory) { return; }

    const scoreData = {
      accuracy: state.score.accuracy,
      challengeId: state.challenge.id,
      gameMode: this.data.gameMode,
      score: state.score.score,
      username: this.username,
      difficulty: this.data.difficulty || state.challenge.difficulty,
      time: new Date()
    };

    if (pr.includes(this.username.toLowerCase()) || this.username.match(ba)) { return; }

    const localScores = JSON.parse(localStorage.getItem(LOCAL_SCORES_KEY) || '[]');
    localScores.push(Object.assign({}, scoreData, {time: scoreData.time.toISOString()}));
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(localScores));
    if (this.db) { this.db.add(scoreData); }

    this.addEventDetail.scoreData = scoreData;
    this.el.emit('leaderboardscoreadded', this.addEventDetail, false);
  },

  fetchScores: function (challengeId) {
    if (this.data.gameMode === 'ride') { return; }

    const state = this.el.sceneEl.systems.state.state;
    const difficulty = state.menuSelectedChallenge.id
      ? state.menuSelectedChallenge.difficulty
      : state.challenge.difficulty;
    const localScores = JSON.parse(localStorage.getItem(LOCAL_SCORES_KEY) || '[]')
      .filter(score => score.challengeId === challengeId &&
        score.difficulty === difficulty && score.gameMode === this.data.gameMode);
    localScores.sort((a, b) => b.score - a.score || new Date(a.time) - new Date(b.time));
    this.setScores(challengeId, localScores.slice(0, NUM_SCORES_DISPLAYED));
  },

  setScores: function (challengeId, scores) {
    this.eventDetail.challengeId = challengeId;
    this.scores.splice(0, this.scores.length, ...scores);
    this.el.sceneEl.emit('leaderboard', this.eventDetail, false);
  },

  /**
   * Is high score?
   */
  checkLeaderboardQualify: function () {
    const state = this.el.sceneEl.systems.state.state;
    const score = state.score.score;

    if (AFRAME.utils.getUrlParameter('dot')) { return; }

    // If less than 10, then automatic high score.
    if (this.scores.length < NUM_SCORES_DISPLAYED) {
      this.qualifyingIndex = this.scores.length;
      this.el.sceneEl.emit('leaderboardqualify', this.scores.length, false);
      return;
    }

    // Check if overtook any existing high score.
    for (let i = 0; i < this.scores.length; i++) {
      if (score > this.scores[i].score) {
        this.qualifyingIndex = i;
        this.el.sceneEl.emit('leaderboardqualify', i, false);
        return;
      }
    }
  }
});
