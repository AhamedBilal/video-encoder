var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const formidable = require('formidable');
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

const axios = require('axios');

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
        console.log(Math.floor(bytesReceived * 100 / bytesExpected));
    });

    form.parse(req, (err, fields, files) => {
        if (err) {
            console.log(err);
            next(err);
            res.json('error');
            return;
        }
        const oldPath = files.file.path;
        const filename = 'video'+Date.now();
        const newPath = path.join(__dirname, 'tmp') + '\\' + files.file.name;
        const rawData = fs.readFileSync(oldPath)
        const filepath = path.join(__dirname, 'out') + '\\' + filename;

        fs.writeFile(newPath, rawData, function (err) {
            if (err) console.log(err)
            ffmpeg(__dirname + '\\tmp\\' + files.file.name)
                .output(filepath + '_720p.mp4')
                .videoCodec('libx264')
                .audioCodec('libmp3lame')
                .audioBitrate(128)
                .size('?x720')
                .format('mp4')

                .output(filepath + '_480p.mp4')
                .videoCodec('libx264')
                .audioCodec('libmp3lame')
                .audioBitrate(128)
                .size('?x480')
                .format('mp4')

                .output(filepath + '_360p.mp4')
                .videoCodec('libx264')
                .audioCodec('libmp3lame')
                .audioBitrate(64)
                .size('?x360')
                .format('mp4')

                .output(filepath + '_240p.mp4')
                .videoCodec('libx264')
                .audioCodec('libmp3lame')
                .audioBitrate(64)
                .size('?x240')
                .format('mp4')

                .output(filepath + '_144p.mp4')
                .videoCodec('libx264')
                .audioCodec('libmp3lame')
                .audioBitrate(64)
                .size('?x144')
                .format('mp4')

                .on('start', function (commandLine) {
                    console.log('Spawned Ffmpeg with command: ' + commandLine);
                })
                .on('codecData', function (data) {
                    console.log('Input is ' + data.audio_details + ' audio ' +
                        'with ' + data.video_details + ' video');
                })
                .on('progress', function (progress) {
                    console.log(Math.floor(progress.percent));
                })
                .on('error', function (error) {
                    return res.send(error);
                })
                .on('end', function (stdout, stderr) {
                    console.log('Transcoding succeeded !');

                    const temp = {
                        systemLanguage: 'eng',
                        src: 'sample.mp4',
                        audioBitrate: 44100,
                        videoBitrate: 350000,
                        width: 640,
                        height: 320,
                        type: 'video'
                    };
                    const mainData = {
                        name: filename,
                        serverName: '_defaultServer_',
                        smilStreams: [],
                        title: 'SMIL for ' + filename +'.mp4'
                    };

                    fs.unlinkSync(newPath);
                    ffmpeg(filepath + '_720p.mp4')
                        .ffprobe(function (err, data) {
                            mainData.smilStreams.push({
                                ...temp,
                                width: data.streams[0].width,
                                height: data.streams[0].height,
                                audioBitrate: data.streams[1].bit_rate,
                                videoBitrate: data.streams[0].bit_rate,
                                src: filename + '_720p.mp4'
                            });
                            ffmpeg(filepath + '_480p.mp4')
                                .ffprobe(function (err, data) {
                                    mainData.smilStreams.push({
                                        ...temp,
                                        width: data.streams[0].width,
                                        height: data.streams[0].height,
                                        audioBitrate: data.streams[1].bit_rate,
                                        videoBitrate: data.streams[0].bit_rate,
                                        src: filename + '_480p.mp4'
                                    });
                                    ffmpeg(filepath + '_360p.mp4')
                                        .ffprobe(function (err, data) {
                                            mainData.smilStreams.push({
                                                ...temp,
                                                width: data.streams[0].width,
                                                height: data.streams[0].height,
                                                audioBitrate: data.streams[1].bit_rate,
                                                videoBitrate: data.streams[0].bit_rate,
                                                src: filename + '_360p.mp4'
                                            });
                                            ffmpeg(filepath + '_240p.mp4')
                                                .ffprobe(function (err, data) {
                                                    mainData.smilStreams.push({
                                                        ...temp,
                                                        width: data.streams[0].width,
                                                        height: data.streams[0].height,
                                                        audioBitrate: data.streams[1].bit_rate,
                                                        videoBitrate: data.streams[0].bit_rate,
                                                        src: filename + '_240p.mp4'
                                                    });
                                                    ffmpeg(filepath + '_144p.mp4')
                                                        .ffprobe(function (err, data) {
                                                            mainData.smilStreams.push({
                                                                ...temp,
                                                                width: data.streams[0].width,
                                                                height: data.streams[0].height,
                                                                audioBitrate: data.streams[1].bit_rate,
                                                                videoBitrate: data.streams[0].bit_rate,
                                                                src: filename + '_144p.mp4'
                                                            });
                                                            axios.post('http://localhost:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/vod/smilfiles', mainData)
                                                                .then(function (response) {
                                                                    console.log(response.body);
                                                                    res.json({url: `http://192.168.1.103:1935/vod/smil:${filename}.smil/playlist.m3u8`});
                                                                })
                                                                .catch(function (error) {
                                                                    res.json(mainData);
                                                                });
                                                            // res.json(mainData);
                                                        });
                                                });
                                        });
                                });
                        });

                })
                .run();
        });
    })

})

app.get('/smil', (req, res) => {
    const temp = {
        systemLanguage: 'eng',
        src: 'sample.mp4',
        audioBitrate: 44100,
        videoBitrate: 350000,
        width: 640,
        height: 320,
        type: 'video'
    };
    const mainData = {
        name: 'dynamic_smil',
        serverName: '_defaultServer_',
        smilStreams: [],
        title: 'test smil post'
    };
    const filepath = __dirname + '\\out\\Fire';
    const filename = 'mp4:Fire';
    const meta = [];
    // ffmpeg(filepath + '_720p.mp4')
    //     .ffprobe(function (err, data) {
    //         mainData.smilStreams.push({
    //             ...temp,
    //             width: data.streams[0].width,
    //             height: data.streams[0].height,
    //             audioBitrate: data.streams[1].bit_rate,
    //             videoBitrate: data.streams[0].bit_rate,
    //             src: filename + '_720p.mp4'
    //         });
    //         ffmpeg(filepath + '_480p.mp4')
    //             .ffprobe(function (err, data) {
    //                 mainData.smilStreams.push({
    //                     ...temp,
    //                     width: data.streams[0].width,
    //                     height: data.streams[0].height,
    //                     audioBitrate: data.streams[1].bit_rate,
    //                     videoBitrate: data.streams[0].bit_rate,
    //                     src: filename + '_480p.mp4'
    //                 });
    //                 ffmpeg(filepath + '_360p.mp4')
    //                     .ffprobe(function (err, data) {
    //                         mainData.smilStreams.push({
    //                             ...temp,
    //                             width: data.streams[0].width,
    //                             height: data.streams[0].height,
    //                             audioBitrate: data.streams[1].bit_rate,
    //                             videoBitrate: data.streams[0].bit_rate,
    //                             src: filename + '_360p.mp4'
    //                         });
    //                         ffmpeg(filepath + '_240p.mp4')
    //                             .ffprobe(function (err, data) {
    //                                 mainData.smilStreams.push({
    //                                     ...temp,
    //                                     width: data.streams[0].width,
    //                                     height: data.streams[0].height,
    //                                     audioBitrate: data.streams[1].bit_rate,
    //                                     videoBitrate: data.streams[0].bit_rate,
    //                                     src: filename + '_240p.mp4'
    //                                 });
    //                                 ffmpeg(filepath + '_144p.mp4')
    //                                     .ffprobe(function (err, data) {
    //                                         mainData.smilStreams.push({
    //                                             ...temp,
    //                                             width: data.streams[0].width,
    //                                             height: data.streams[0].height,
    //                                             audioBitrate: data.streams[1].bit_rate,
    //                                             videoBitrate: data.streams[0].bit_rate,
    //                                             src: filename + '_144p.mp4'
    //                                         });
    //                                         axios.post('http://localhost:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/vod/smilfiles', mainData)
    //                                             .then(function (response) {
    //                                                 console.log(response);
    //                                                 res.json(mainData);
    //                                             })
    //                                             .catch(function (error) {
    //                                                 res.json(mainData);
    //                                             });
    //                                         // res.json(mainData);
    //                                     });
    //                             });
    //                     });
    //             });
    //     });
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
