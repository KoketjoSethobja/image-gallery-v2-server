const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require("cors");
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcrypt');

const app = express();
const saltRounds = 10
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
    origin: ['http://localhost:3000', '*'],
    method: ['GET', 'POST', 'DELETE', 'PUT'],
    credentials: true,
}));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    //key: 'userId', //name of the cookie
    secret: 'koketjosethobjasethobjakoketjo', //
    maxAge: 24 * 60 * 60 * 1000,
    resave: true,
    saveUninitialized: true
}))

const db = mysql.createConnection({
    user: 'koketjo',
    host: 'mysql-db-gallery.cpu7powidjpl.us-east-1.rds.amazonaws.com',
    password: 'skoketjo',
    database: 'public'
});

cloudinary.config({
    cloud_name: 'koketjosethobja',
    api_key: '941348775951192',
    api_secret: 'y5CEoBG-UQFwqqHYXSBqF0qxiC0',
    secure: true
});

app.post('/register', (req, res) => {
    const inputData = {
        username: req.body.username,
        password: req.body.password
    }
    var sql = 'INSERT INTO public.Users (username, password) VALUES (?,?)';

    bcrypt.hash(inputData.password, saltRounds, (err, hash) => {
        if(err) {
            console.log(err)
        }
        db.query(sql, [inputData.username, hash], (err, results) => {
            if(err){
                console.log(err)
            }
            if(results) {
                res.send({passed: 'Registration successful'})
                //console.log(results)
            } else {
                res.send({message: 'Registration failed'})
                //console.log(err)
            }
        })
    })        
})

app.post('/login', (req, response) => {
    const username = req.body.username;
    const password = req.body.password;
    var sql = 'SELECT * FROM public.Users WHERE username = ?';

    db.query(sql, username, (notFound, found) => {
        if(found){
            bcrypt.compare(password, found[0].password, (err, res) => {
                if(res){
                    req.session.regenerate(() => {
                        app.set('id', found[0].idUsers); 
                        req.session.user = found[0].username; 
                        console.log('password matches user logged in') 
                        // console.log(req.session.user) 
                        // console.log(res)                                              
                        // console.log(found[0].idUsers)
                        response.send(found)
                    })
                } else {
                    console.log('password do not match' + err)
                }
            })
        } else {
            console.log('username does not exist')
        }
    })
})

// app.post('/login', (req, res) => {
//     const username = req.body.username;
//     const password = req.body.password;
//     var sql = 'SELECT * FROM public.Users WHERE username = ?';
//     db.query(sql, username, (err, result) => {
//         if(err){
//             // res.send({err: err})
//             //res.send({message: err})
//             console.log(err)
//         }
//         if(result.length > 0) {            
//             bcrypt.compare(password, result[0].password, (error, response) => {
//                 if(response){
//                     // app.set('id', result[0].idUsers)
//                     // res.send({message: result})
//                     app.set('id', result[0].idUsers); 
//                     req.session.user = result[0].username;                    
//                     console.log(req.session.user)
//                     console.log(response)
//                     res.send(result)
//                 } else {
//                     // res.send({message: error})
//                     console.log(error)
//                     // res.send({message: 'Wrong username or password'})
//                 }
//             })
//         } else {
//             console.log('failed')
//             // res.send({message: 'User does not exist'})
//         }
//     })
// })

app.post('/upload', (req, res) => {
    const data = {
        publicId: req.body.publicId,
        fileName: req.body.fileName,
        uploadDate: req.body.uploadDate,
        secureUrl: req.body.secureUrl,
        size_in_mb: req.body.size_in_mb,                
        format: req.body.format,                                
        height: req.body.height,
        width: req.body.width,
        user_id: req.body.user_id
    }

    var sql = 'INSERT INTO public.photo SET ?'

    db.query(sql, data, (err, result) => {
        if(err){
            res.send({error: 'Upload unsuccessful'})
        } else {
            res.send({message: 'Successfully uploaded'})
        }
    })

})

app.get('/images', (req, res) => {
    const log_user = app.get('id');  
    console.log(log_user)  
    db.query('SELECT * FROM public.photo WHERE user_id = ?', log_user, (err, result) => {
        if(err){
            res.send({error: 'User not logged in '})
            console.log(err)
        } else {
            res.send(result)
            console.log(result)
        }
    })
})

app.put('/update', (req, res) => {

    const newPublicId = req.body.newPublicId;
    const publicId = req.body.publicId

    cloudinary.uploader.rename(publicId, newPublicId, (error, result) => {

        if(error){
            console.log(error)
        } else {
            console.log(result)
            db.query('UPDATE photo SET publicId = ? WHERE publicId = ?', [newPublicId, publicId], (new_error, new_result) => {
                if(new_error) {
                    res.send({error: 'Image\'s name failed to be changed'})
                } else {
                    res.send({message: 'Image\'s name successfully changed'})
                }
            })
        }

    })

})

app.delete('/delete/:publicId', (req, res) => {
    const publicId = req.params.publicId;
    cloudinary.uploader.destroy(publicId, (error, result) => {
        if(error) {
            console.log(error)
            console.log('COULD NOT DELETE FROM CLOUDINARY')
        } else {
            console.log(result);
            db.query('DELETE FROM photo WHERE publicId = ?', [publicId], (err, data) => {
                if(err) {
                    console.log(err)
                    console.log('COULD NOT DELETE FROM DB')
                    res.send({error: 'could not delete'})
                } else{
                    console.log(data)
                    res.send({message: 'deleted successfully'})
                }
            })
        }
    });
})

app.listen(PORT, () => {
    console.log('running server');
})