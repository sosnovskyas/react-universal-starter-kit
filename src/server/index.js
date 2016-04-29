'use strict';

import express from 'express';
// import path from 'path';

let app = express();

app.set('port', (process.env.PORT || 5000));

// TODO не работает! надо что то придумать
// app.use('/', express.static(path.join(__dirname, 'dist/public')));

app.all('/*', (req, res) => {
  res.send('ok')
});

app.listen(app.get('port'), function() {
  console.log('Server started: http://localhost:' + app.get('port') + '/');
});
