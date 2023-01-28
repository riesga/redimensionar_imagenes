const fs = require('fs');
const { execSync } = require('child_process');

// especificar el folder
const folder = 'D:\\copias-s3\\';

// leer el contenido del folder
fs.readdir(folder, (err, files) => {
    if (err) {
        console.error(err);
        return;
    }
    // filtrar los archivos con extensión .bak
    const bakFiles = files.filter(file => file.endsWith('.bak'));
    // comprimir cada archivo encontrado
    bakFiles.forEach(file => {
        const input = folder + file;
        const output = folder + file + '.rar';
        try {
            // ejecutar el comando de WinRAR
            execSync(`"c:/Program Files/WinRAR/winrar" a -ep1 -r "${output}" "${input}"`);
            console.log(`Successfully compressed ${file}`);
        } catch (err) {
            console.error(err);
        }
    });
});
