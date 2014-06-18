var _ = require("underscore");
var mongoose = require("mongoose");
mongoose.connect("mongodb://192.168.0.107/test");
console.log("Connecting to mongo db");
var zmq = require("zmq");
var argv = require("optimist")
  .default({bind: "tcp://*:5555", conn: "tcp://localhost:6666"}).argv;

var responder = zmq.socket("asyncrep");
responder.bind(argv.bind);
console.log("Binding to: " + argv.bind);
var requester = zmq.socket("asyncreq");
requester.connect(argv.conn);
console.log("connecting to: " + argv.conn);

var schema = new mongoose.Schema({
    id: String,
    name: String,
    cmd: String,
    params: Array,
    auto: Boolean
});

var Process = mongoose.model("Process", schema);
responder.on("message", function(buffer, response) {
  
  var message = JSON.parse(buffer.toString());
  console.log("from client " + JSON.stringify(message));

  var process = Process(message.process);
    
    
  if(message.type == "save") {
    if(process.id == "" || process.name == "" || process.cmd == "" || process.params == "") {
      response.send(500, "Fill the required fields!");
    }else{
      Process.find({id: process.id}, function(error, dbProcesses) {
        if(dbProcesses.length > 0) {
          response.send(500, "Id is the same");         
        }
        else {
          process.save(function(error, dbProcess) {

            if(error) {
              console.log("error" + error);
            }else{
              console.log("Mongodb sends: " + dbProcess);
            }   
            
            response.send("Process was saved!");
          });
        }
      });
    }
  }  

});

responder.on("message", function(data, response) {
  var request = JSON.parse(data.toString());
  
  console.log("Received data : " + data.toString());
  
  if(request.type == "get") {
    
    Process.find(function(error, processes) {
      if(error) {
        console.log("Error" + " " + error);
        response.send(error);
      }else{
        console.log("Mongodb sends: " + " " + processes);
        console.log("Reply data : " + data.toString());
        response.send(processes);
      }
    });
  }
});

responder.on("message", function(buffer, response) {
  var message = JSON.parse(buffer.toString());
  
  if(message.type == "delete") {
    Process.findOneAndRemove({id: message.processId}, function(error, process) {
      if(error) {
        console.log("Mongodb sends error" + " " + error);
      }else{
        console.log("Mongodb sends" + " " + process);
        response.send(process);
      }
    });
  }
});

responder.on("message", function(buffer, response) {
  var message = JSON.parse(buffer.toString());
  if(message.type == "start") {
    
    Process.findOne( {id: message.processId}, function(error, process) {
      if(error) {
        console.log("Process not found");
        response.send("error" + error);
      }else{
        requester.send(JSON.stringify(process), function(res) {
          response.send(res);
        });
      }
    });
  }
  
});
