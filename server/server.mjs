#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { options, usage } from './cli-options.mjs';
import { exit } from 'process';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import api from './api.mjs';
import staticNotes from './static-notes.mjs';
import Directory from './Directory.mjs';

if ('help' in options) {
    console.log(usage);
    exit();
}

if (options.directory == null) {
    console.error('A notes directory must be provided.');
    console.log(usage);
    exit();
}

const server = fastify();

if (process.env.NODE_ENV && process.env.NODE_ENV == 'development') {
    const fastifyWebpack = await import('fastify-webpack-hmr');
    const { default: webpack } = await import('webpack');
    const { default: webpackConfig } = await import('../webpack.config.js');
    const compiler = webpack({ ...webpackConfig, mode: 'development' });
    server.register(fastifyWebpack, { compiler });
} else {
    server.register(fastifyStatic, { root: __dirname + '/../dist', prefix: '/app/' });
}

server.get('/', async (request, reply) => {
    return reply.redirect('/app/');
});

const directory = new Directory(options.directory);
server.register(api, { prefix: '/api', directory });
server.register(staticNotes, { prefix: '/notes', directory });

server.listen({ port: options.port, host: options.host });
