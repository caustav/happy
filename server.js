var express = require('express')
var fileSystem = require('fs')

app = express(); 
app.use(express.static('./'));
app.get('/index.html', function (req, res) {

  res.sendfile(_dirname+'/index.html');

});

var server = app.listen(8020, function (req, res) {
    var host = server.address().address
    var port = server.address().port
    console.log("app listening at", host, port)
});

app.get('/descriptor/:userId', function (req, res) {
  fileSystem.readFile( __dirname + "/assets/" + req.params.userId + "/data.bin", 'utf8', function (err, data) {
    //  console.log( data );
     res.end( data );
  });
})