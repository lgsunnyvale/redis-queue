"use strict";

var conf = require('./config')
  , redis = require('redis')
  , uuid = require('node-uuid')
  , Redis = require('./lib/redis');

var RedisQueue = function() {
  this.client = new Redis();
}

RedisQueue.prototype.queueJob = function(queueName, jobDescription, cb) {
  var jobID = uuid.v4();
  jobDescription._jobID = jobID;
  
  try {
    this.client.rpush(queueName, JSON.stringify(jobDescription));
  }
  catch(err) {
    cb(err);
  }
  
  if (cb) {
    var notificationClient = new Redis();
    notificationClient.subscribe(queueName + '-notification:' + jobID);
    notificationClient.on('message', function(channel, message) {
      cb(null, JSON.parse(message));
      notificationClient.quit();
    });
  }
}

RedisQueue.prototype.monitorJobQueue = function(queueName, cb) {
  var self = this;
  (function poll() {
    self.client.blpop(queueName, 0, function(err, jobDesciption) {
      if (jobDesciption) {
        cb(JSON.parse(jobDesciption[1]));
      }
      setInterval(poll, 0);
    });  
  })();
}

RedisQueue.prototype.publishNotification = function(queueName, jobDescription, data) {
  this.client.publish(queueName + '-notification:' + jobDescription._jobID, JSON.stringify(data));
}

module.exports = RedisQueue;