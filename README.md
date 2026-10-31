# CRITICAL 
moonrider uses an older webpack4 that is incompactible with newer node.js because of openss3 changes.
to fix run -> 

$env:NODE_OPTIONS="--openssl-legacy-provider"   ( windows )
export NODE_OPTIONS="--openssl-legacy-provider" ( Linux )


# default username 
this.username = localStorage.getItem('moonriderusername') || 'Super Zealot';

# scores (local browser storage is being used instead of firebase)
const scoreData = {
  accuracy: state.score.accuracy,
  challengeId: challengeId,
  gameMode: this.data.gameMode,
  score: state.score.score,
  username: this.username,
  difficulty: difficulty,
  time: new Date()
};

