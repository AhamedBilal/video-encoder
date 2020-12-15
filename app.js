var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const formidable = require('formidable');
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");


ffmpeg.setFfmpegPath("C:/ffmpeg/bin/ffmpeg.exe");
ffmpeg.setFfprobePath("C:/ffmpeg/bin/ffprobe.exe");


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.post('/convert', (req, res, next) => {
  const form = formidable({multiples: true});
  form.maxFileSize = 2000 * 1024 * 1024;
  form.on('progress', (bytesReceived, bytesExpected) => {
    console.log(bytesReceived * 100 / bytesExpected)
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log(err);
      next(err);
      res.json('error');
      return;
    }
    const oldPath = files.file.path;
    const newPath = path.join(__dirname, 'tmp') + '\\' + files.file.name;
    const rawData = fs.readFileSync(oldPath)

    fs.writeFile(newPath, rawData, function (err) {
      if (err) console.log(err)
      ffmpeg(__dirname+'\\tmp\\'+files.file.name)
          .output(path.join(__dirname, 'out') + '\\' + files.file.name.replace(/\.(mkv|avi|mp4|flv|mov)$/g, '') + '_780p.mp4')
          .videoCodec('libx265')
          .audioCodec('libmp3lame')
          .audioBitrate(128)
          .size('?x780')
          .format('mp4')

          .output(path.join(__dirname, 'out') + '\\' + files.file.name.replace(/\.(mkv|avi|mp4|flv|mov)$/g, '') + '_480p.mp4')
          .videoCodec('libx265')
          .audioCodec('libmp3lame')
          .audioBitrate(128)
          .size('?x480')
          .format('mp4')

          .output(path.join(__dirname, 'out') + '\\' + files.file.name.replace(/\.(mkv|avi|mp4|flv|mov)$/g, '') + '_360p.mp4')
          .videoCodec('libx265')
          .audioCodec('libmp3lame')
          .audioBitrate(64)
          .size('?x360')
          .format('mp4')

          .on('start', function (commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
          })
          .on('codecData', function (data) {
            console.log('Input is ' + data.audio_details + ' audio ' +
                'with ' + data.video_details + ' video');
          })
          .on('progress', function (progress) {
            console.log(progress.percent);
          })
          .on('error', function (error) {
            return res.send(error);
          })
          .on('end', function (stdout, stderr) {
            console.log('Transcoding succeeded !');
            fs.unlinkSync(path.join(__dirname, 'tmp') + '/' + files.file.name);
            res.send("Successfully uploaded");
          })
          .run();
    });
  })

})

app.get('/smil', (req, res) => {

});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
