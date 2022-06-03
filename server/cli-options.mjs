import commandLineArgs from 'command-line-args';

const options = commandLineArgs([
    { name: 'port', alias: 'p', type: Number, defaultValue: 8080 },
    { name: 'directory', alias: 'd', type: String },
]);

export default options;