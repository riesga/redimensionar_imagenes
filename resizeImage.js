const fs = require('fs');
const sharp = require('sharp');

const folderPath = 'C:\\fotos';
const height = 200; // Altura esperada


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
          sharp(tempFile).metadata()
            .then(function (metadata) {
              if (metadata.height >= height) {
                sharp(tempFile)
                  .resize(null, height)
                  .withMetadata()
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
              } else {
                console.log(`${file} is already ${height}px height`);
                fs.unlink(tempFile, (err) => {
                  if (err) {
                    console.error(err);
                  }
                });
              }
            })
            .catch(function (err) {
              console.log(err);
            });
        }
      });
    }
  });
});