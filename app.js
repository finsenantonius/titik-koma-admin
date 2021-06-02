const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream')
const methodOverride = require('method-override');
const bodyParser = require('body-parser');

const app = express();
//Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
//front endnya disini pake ejs
app.set('view engine', 'ejs');


//Mongo URI
const MongoURI = 'mongodb+srv://dev:dev123@realmcluster.ktro2.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'

//create connection
const conn = mongoose.createConnection(MongoURI);

//init gfs
let gfs;

conn.once('open',()=>{
   //init stream
    gfs = Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
})

//create storage engine
const storage = new GridFsStorage({
    url: MongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });

// @route GET /
// @desc load form
app.get('/',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length === 0){
            res.render('index',{files:false});
        }else{
            files.map(file => {
                if(file.contentType === 'image/jpg' || file.contentType === 'image/png' || file.contentType === 'video/mp4'){
                    file.isImage = true;
                }else{
                    file.isImage = false;
                }
            });
            res.render('index',{files:files});
        }
    
    });
});

// @route POST /upload
// @desc uploa file to db
// @upload -> middleware yang storage engine, 'file'-> dari index.ejs name dari input:file nya
app.post('/upload',upload.single('file'),(req,res)=>{
    //buat tes doang
    // res.json({file:req.file});

    //buat balik ke home lagi
    res.redirect('/');
});

// @route GET /files
// @desc display all file
app.get('/files',(req,res)=>{
    //check filenya ada ato ga
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length == 0){
            return res.status(404).json({
                err:'no file exist'
            });
        }

        //filenya ada
        return res.json(files);
    });
});

// @route GET /files/:fileName
// @desc display file pake namanya
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
      // File exists
      return res.json(file);
    });
  });


// @route GET /image/:fileName
// @desc display image pake namanya
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
      
      //check image format
      if(file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
        //read stream
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      }else{
          res.status(404).json({
              err: 'not an image'
          });
      }
    });
  });

// @route GET /video/:fileName
// @desc display video pake namanya
app.get('/video/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
      
      //check image format
      if(file.contentType === 'video/mp4'){
        //read stream
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      }else{
          res.status(404).json({
              err: 'not an video'
          });
      }
    });
  });

//@route DELETE /files/:id
//@desc delete file
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
      if (err) {
        return res.status(404).json({ err: err });
      }
  
      res.redirect('/');
    });
  });
  
const port = 5000;
app.listen(port,()=>console.log(`server started on port ${port}`));