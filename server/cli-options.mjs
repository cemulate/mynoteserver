import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

const options = commandLineArgs([
    { name: 'help' },
    { name: 'host', alias: 'h', type: String, defaultValue: '127.0.0.1' },
    { name: 'port', alias: 'p', type: Number, defaultValue: 8080 },
    { name: 'directory', alias: 'd', type: String },
]);

const usage = commandLineUsage([
    {
        header: 'Options',
        optionList: [
            {
                name: 'directory',
                alias: 'd',
                typeLabel: '{underline path}',
                description: 'The root directory to serve and store notes from',
            },
            {
                name: 'host',
                alias: 'h',
                typeLabel: '{underline string}',
                description: 'The IP address to listen on',
                defaultValue: '127.0.0.1',
            },
            {
                name: 'port',
                alias: 'p',
                typeLabel: '{underline int}',
                description: 'The port to listen on',
                defaultValue: '8080',
            },
        ],
    },
]);

export { options, usage };
