var express = require('express')
var bodyParser = require('body-parser');
var fileSystem = require('fs')
const mkdirp = require('mkdirp');

app = express(); 
app.use(express.static('./'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/index.html', function (req, res) {

  res.sendfile(_dirname+'/index.html');

});
app.get('/admin.html', function (req, res) {

  res.sendfile(_dirname+'/admin.html');

});

var server = app.listen(8020, function (req, res) {
    var host = server.address().address
    var port = server.address().port
    console.log("app listening at", host, port)
});

app.get('/descriptor/:userId', function (req, res) {
  fileSystem.readFile( __dirname + "/profiles/" + req.params.userId + "/data.bin", 'utf8', function (err, data) {
    //  console.log( data );
     res.end( data );
  });
})

app.get('/happy/current', function (req, res) {
  fileSystem.readFile( __dirname + "/profiles/" + "id.tmp", 'utf8', function (err, data) {
    //  console.log( data );
     res.end( data );
  });
})

app.post('/descriptor/:userId', async (req, res) => {
  var data = req.body.labeledDescriptor
  await mkdirp(__dirname + "/profiles/" + req.params.userId)

  fileSystem.writeFile( __dirname + "/profiles/" + req.params.userId + "/data.bin", data, function (err) {
    if (err) throw err
    res.end( 'Image Information Saved' )
  });
})