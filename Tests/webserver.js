let express = require('express')
let app = express();
app.get('/', (_, res) => res.redirect('/index.html'));
app.use('/', express.static('./www'));


app.listen(8080);