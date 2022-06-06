#!/usr/bin/env node

import * as url from 'url';
import { options, usage } from './cli-options.mjs';
import { exit } from 'process';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import fastify from 'fastify';
import fastifyStatic from '@fastify/static';

if ('help' in options) {
    console.log(usage);
    exit();
}

if (options.directory == null) {
    console.error('A notes directory must be provided.');
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

import api from './api.mjs';
server.register(api);

server.listen(options.port, options.host);
