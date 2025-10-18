const sessions = {};

function startRelay(sock, user, admin) {
  sessions[user] = admin;
  sessions[admin] = user;
}

function endRelay(sock, user) {
  delete sessions[user];
}

function getRelayTarget(id) {
  return sessions[id];
}

module.exports = { startRelay, endRelay, getRelayTarget };
