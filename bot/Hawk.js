const Eris = require("eris-additions")(require("eris"),
    { enabled: ["Channel.awaitMessages", "Member.bannable", "Member.kickable", "Member.punishable", "Role.addable", "Channel.sendMessage", "Message.guild"] }
);
const rethinkdb = require('../util/rethink');
const fancyLog = require('fancy-log');
const fs = require('fs');
const colors = require('colors');

const config = JSON.parse(fs.readFileSync('./data/config.json', 'utf-8'));

class Hawk extends Eris.Client {
    constructor(token, options = {}) {
        options = {
            options,
            firstShardID: cluster.worker.shardStart,
            lastShardID: cluster.worker.shardEnd,
            maxShards: cluster.worker.totalShards
        }

        super(token, options);

        this.worker = cluster.worker;
        this.shard = {
            id: this.worker.shardStart
        }
        this.load(true);
    }

    async load(doLaunch=false) {
        require('../sharding/OutputHandler');
        this.info(`Core`, `Successfully launched shard ${this.worker.shardStart}!`);
        this.rethink = await rethinkdb.connectToRethink();
        await rethinkdb.createDefaults(this.rethink);
        this.servers = new Eris.Collection();
        this.husers = new Eris.Collection();
        this.config = config;
        this.loadingManager = new (require('./core/LoadingManager'))(this);
        this.loadingManager.loadAll();
        if(doLaunch)
            this.launch();
    }

    info(title, message) {
        this.log('INFO', title, message);
    }

    debug(title, message) {
        this.log('DEBUG', title, message);
    }

    error(title, message) {
        this.log('ERROR', title, message);
    }

    warn(title, message) {
        this.log('WARN', title, message);
    }

    log(type, title, message) {
        console.log(`[ `.white + `W - ${this.worker.id} | S - ${(this.worker.shardStart.toString().length == 1 ? "0" + this.worker.shardStart.toString() : this.worker.shardStart)} ] `.white + `[`.white + ` ${type} `.green + `] `.white + `[`.white + ` ${title} `.cyan + `] `.white + `${message}`.white);
    }
    
    launch() {
        this.connect();

        this.on('ready', () => {
            this.emit('launchNext');            
        });
    }
}
module.exports = Hawk;