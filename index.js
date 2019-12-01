const functions = require("firebase-functions");
const https = functions.region("asia-northeast1").https;
const admin = require("firebase-admin");
admin.initializeApp();
const mysql = require("mysql");
const util = require("util");

const mysqlConfig = {
  connectionLimit: 1,
  user: functions.config().db.user,
  password: functions.config().db.password,
  database: functions.config().db.name
};
let mysqlPool;

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = https.onRequest((request, response) => {
  response.send("Hello from Firebase!" + functions.config().sample.key);
});

exports.hello = https.onCall(async (data, context) => {
  return {
    message: `Hello, ${data.name}. ${functions.config().sample.key}`,
    uid: context.auth.uid
  };
});

exports.updateUser = https.onCall(async (data, context) => {
  let user = await _selectUser(context.auth.uid);
  if (user) {
    user.firstName = data.firstName;
    user.familyName = data.familyName;
    return await _updateUser(user);
  } else {
    user = {
      uid: context.auth.uid,
      firstName: data.firstName,
      familyName: data.familyName
    };
    return await _insertUser(user);
  }
});

exports.getUser = https.onCall(async (data, context) => {
  return await _selectUser(context.auth.uid);
});

_selectUser = async function(uid) {
  await _initMysqlPool();
  const query = `select * from users where uid = ?`;

  let record = await mysqlPool.query(query, uid);

  console.log(record);
  let user = null;
  if (record.length > 0) {
    user = record[0];
  }

  return user;
};

_insertUser = async function(user) {
  await _initMysqlPool();
  const query = `insert into users (uid, firstName, familyName) values (?, ?, ?)`;

  let record = await mysqlPool.query(query, [
    user.uid,
    user.firstName,
    user.familyName
  ]);

  return record;
};

_updateUser = async function(user) {
  await _initMysqlPool();
  const query = `update users set firstName = ? , familyName = ? where uid = ? `;

  let record = await mysqlPool.query(query, [
    user.firstName,
    user.familyName,
    user.uid
  ]);

  return record;
};

_initMysqlPool = async function() {
  if (functions.config().db.host) {
    mysqlConfig.host = functions.config().db.host;
  } else {
    mysqlConfig.socketPath = `/cloudsql/${functions.config().db.connection}`;
  }

  if (!mysqlPool) {
    mysqlPool = await mysql.createPool(mysqlConfig);
  }
  mysqlPool.query = util.promisify(mysqlPool.query);
};
