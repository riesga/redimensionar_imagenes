const sharp = require("sharp");
const path = require('path');
const fs = require('fs');
sharp.cache(false);

async function resizeImageOld() {
  try {
    await sharp("sammy.png")
      .resize({
        width: 150,
        height: 97
      })
      .toFile("sammy.png");
  } catch (error) {
    console.log(error);
  }
}

async function resizeImage(image) {
  let buffer = await sharp(image)
    .resize({
      fit: sharp.fit.inside,
      withoutEnlargement: true,
    }, 167)
    .toBuffer();
  return sharp(buffer).toFile(image);
}


function getImages() {
  //joining path of directory 
  const directoryPath = path.join(__dirname);
  //passsing directoryPath and callback function
  fs.readdir(directoryPath, function (err, files) {
    //handling error    
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }
    //listing all files using forEach
    files.forEach(function (file) {
      // Do whatever you want to do with the file
      const ext = path.extname(file);
 
      if (ext === ".png" || ext === ".jpg" || ext === ".PNG" || ext === ".JPG") {
        resizeImage(file);
      }      
    });
  });
}

//resizeImage();
getImages();