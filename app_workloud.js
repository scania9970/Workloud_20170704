var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var mysql = require('mysql');
var MySqlStore = require('express-mysql-session')(session);
var multer = require('multer');
var fs = require('fs')
var html = require('html');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); 
           //+ Date.now());
    }
});
var upload = multer({
    storage: storage
});
var app = express();
app.use('/user', express.static('uploads'));
var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'o2'
});
app.use(session({
    secret: 'asdlfkjas;dlkfj',
    resave: false,
    saveUninitialized: true,
    store: new MySqlStore({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'o2'
    })
}));

conn.connect();

app.use(bodyParser.urlencoded({
    extended: false
}));
app.set('views', './views');
app.set('view engine', 'jade');
app.locals.pretty = true;

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/idcheck', function (req, res) {
    res.render('idcheck');
});



app.post('/idcheck', function (req, res) {
    var id = req.body.id;
    var sql = 'SELECT * FROM user_info';
    var existed = 0;
    conn.query(sql, function (err, rows, fields) {
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].id == id) {
                existed = 1;
            }
        }
        if (existed === 1) {
            res.render('idcheck', {
                id: id,
                msg: '다른 아이디를 사용하세요.'
            });
        } else {
            res.render('idcheck', {
                id: id,
                isOk: existed,
                msg: '사용 가능한 아이디입니다.'
            });
        }
    });
});

app.post('/update_completed', function (req, res) {
    //var lno = req.body.lno;
    //var isCompleted = req.body.isCompleted;
    console.log(req.body._lno);
    console.log(req.body.title);
    console.log(req.body.writer);
    console.log(req.body.date);
    console.log(req.fileflag);
    console.log(req.body.isCompleted);
});

app.post('/register', function (req, res) {
    var id = req.body.id;
    var pwd = req.body.password;
    var username = req.body.username;
    var part = req.body.part;
    var position = req.body.position;
    var displayname = req.body.displayname;
    var email = req.body.email;
    var mobile = req.body.mobile;
    var description = req.body.description;
    var sql = 'INSERT INTO user_info(id, password, name, part, position, displayname, email, mobile, description) VALUES(?,?,?,?,?,?,?,?,?)';
    var params = [id, pwd, username, part, position, displayname, email, mobile, description];
    if (id && pwd && username && part && position && displayname && email && mobile && description && sql) {
        conn.query(sql, params, function (err, rows, fields) {
            if (err) {
                console.log(err);
            } else {
                res.render('index', {
                    id: id,
                    msg: '로그인하세요.'
                });
            }
        });
    }
});

app.post('/login', function (req, res) {

    var id = req.body.id;
    var pwd = req.body.password;
    var sql = 'SELECT * FROM user_info';
    var existed = 0;
    var displayName = '';
    var is = 0;
    conn.query(sql, function (err, rows, fields) {
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].id === id && rows[i].password === pwd) {
                existed = 1;
                displayName = rows[i].displayname;
                if (rows[i].position == 'general') {
                    is = 1;
                }
            }
        }
        req.session.is = is;
        req.session.displayName = displayName;
        req.session.save(function () {
            if (existed === 1) {
                var sql = 'SELECT * FROM todolist';
                conn.query(sql, function (err, lists, fields) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.render('list', {
                            lists: lists,
                            displayname: req.session.displayName,
                            is: req.session.is
                        });
                    }
                });
            } else {
                res.redirect('/');
            }
        })
    });
});

app.get('/logout', function (req, res) {
    delete req.session.displayName;
    delete req.session.is;
    req.session.save(function () {
        res.redirect('/');
    });
});

app.get('/login', function (req, res) {
    var sql = 'SELECT * FROM todolist';
    conn.query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        } else {
            res.render('list', {
                lists: rows,
                displayname: req.session.displayname,
                is: req.session.is
            });
        }
    });
});
app.get('/register', function (req, res) {
    res.render('register');
});


app.get('/create', function (req, res) {
    res.render('addwork', {
        displayname: req.session.displayName,
        is: req.session.is
    });

});

app.post('/uploadwork', upload.single('fileflag'), function (req, res) {

    var title = req.body.title;
    var content = req.body.content;
    var writer = req.body.writer;
    var date = new Date();
    var fileflag = req.file;
    var completed = 0;
    var path = req.file.originalname;
    if (fileflag) {
        fileflag = 1;
    }
    var sql = 'SELECT * FROM todolist';
    var existed = 0;
    conn.query(sql, function (err, rows, fields) {
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].title === title) {
                existed = 1;
            }
        }
        if (existed === 0) {
            var sql = 'INSERT INTO todolist(title, content, writer, date, fileflag, completed, path) VALUES(?,?,?,?,?,?,?)';

            var params = [title, content, writer, date, fileflag, completed, path];

            conn.query(sql, params, function (err, rows, fields) {
                if (err) {
                    console.log(err);
                } else {
                    var sql = 'SELECT * FROM todolist';
                    conn.query(sql, function (err, row, fields) {
                        res.render('list', {
                            lists: row,
                            displayname: req.session.displayName,
                            is: req.session.is
                        });
                    })
                }
            });
        } else {
            var sql = 'SELECT * FROM todolist';
            conn.query(sql, function (err, row, fields) {
                res.render('list', {
                    lists: row,
                    displayname: req.session.displayName,
                    is: req.session.is
                });
            })
        }
    });
});
app.get('/showContent/:lno', function (req, res) {
    var lno = req.params.lno;
    var sql = 'SELECT * FROM todolist WHERE lno = ?'
    var params = [lno];
    conn.query(sql, params, function (err, rows, fields) {
        res.render('content', {
            contents: rows[0],
            displayname: req.session.displayName,
            is: req.session.is
        });
    });


});
app.get('/edit/:lno', function (req, res) {
    var lno = req.params.lno;
    var params = [lno];
    var sql = 'SELECT * FROM todolist WHERE lno = ?'
    conn.query(sql, params, function (err, rows, fields) {
        res.render('contentEdit', {
            contents: rows[0],
            displayname: req.session.displayName,
            is: req.session.is
        });
    });
});
app.post('/editComplete', function (req, res) {
    var lno = req.body.lno;
    var title = req.body.title;
    var content = req.body.content;
    var writer = req.body.writer;
    var fileflag = 1;
    var params = [title, content, writer, lno];
    var sql = 'UPDATE todolist SET title=?, content=?, writer=? WHERE lno=?'

    conn.query(sql, params, function (err, rows, fields) {
        if (err) {
            console.log(err);
        } else {
            var sql = 'SELECT * FROM todolist WHERE lno=?'
            var params = [lno];
            conn.query(sql, params, function (err, row, fields) {
                res.render('content', {
                    contents: row[0]
                });
            });

        }

    });
});

app.post('/completeProcess', function (req, res) {
    var lno = req.body.lno;
    var isChecked = req.body.checked;
    if (isChecked === 'true') {
        var params = [lno];
        var sql = "UPDATE todolist SET completed = 1 WHERE lno = ?";
        conn.query(sql, params, function (err, rows, fields) {
            res.sendStatus(200);
        });
    } else {
        var params = [lno];
        var sql = "UPDATE todolist SET completed = 0 WHERE lno = ?";
        conn.query(sql, params, function (err, rows, fields) {
            res.sendStatus(200);
        });
    }

});

app.get('/list', function (req, res) {
    var sql = 'SELECT * FROM todolist';
    conn.query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        } else {
            res.render('list', {
                lists: rows,
                displayname: req.session.displayName,
                is: req.session.is
            });
        }
    });
});


app.listen(3000, function () {
    console.log('Connected 3000 Port!');
});





























