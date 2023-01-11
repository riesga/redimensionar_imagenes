const fs = require('fs');
const sharp = require('sharp');

const folderPath = 'D:\\fotos';


fs.readdir(folderPath, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  files.forEach((file) => {
    if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.PNG') || file.endsWith('.JPG')) {
      const tempFile = `${folderPath}/temp-${file}`;
      
      fs.copyFile(`${folderPath}/${file}`, tempFile, (err) => {
        if (err) {
          console.error(err);
        } else {
          sharp(tempFile)
            .resize({
              fit: sharp.fit.inside,
              withoutEnlargement: true,
            }, 167)
            .toFile(`${folderPath}/${file}`, (err, info) => {
              if (err) {
                console.error(err);
              } else {
                fs.unlink(tempFile, (err) => {
                  if (err) {
                    console.error(err);
                  } else {
                    console.log(`Successfully resized ${file}`);
                  }
                });
              }
            });
        }
      });
    }
  });
});