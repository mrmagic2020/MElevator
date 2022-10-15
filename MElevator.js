//LiteLoaderScript Dev Helper
/// <reference path="d:\PLGUINS\JS/dts/HelperLib-master/src/index.d.ts"/> 

const NAME = `MElevator`;
const INFO = `方块电梯`;
const VERS = [1,1,0];
ll.registerPlugin(
    /* name */ NAME,
    /* introduction */ INFO,
    /* version */ VERS,
    /* otherInformation */ {}
); 

const dirPath = `.\\plugins\\${NAME}\\`;
const configPath = dirPath + `config.json`;
const logPath = dirPath + `logs\\${formatDate(true, false)}.log`;
const updatePath = `.\\plugins\\${NAME}.js`;

const THISID = 4724;
const API = `https://api.minebbs.com/api/openapi/v1/resources/${THISID}`;
const VERS_STR = VERS.join(`.`);
let updateMSg;
network.httpGet(API, (stat, res) => {
    let dt = JSON.parse(res).data;
    switch (stat) {
        case 200:
            if (dt.version == VERS_STR) {
                logger.warn(`最新版本已装载！（${VERS_STR}）`);
            } else {
                logger.warn(`新版本的插件已发布！正在抓取文件……`);
                network.httpGet(`https://raw.codehub.cn/p/melevator/d/MElevator/git/raw/main/MElevator.js?token=78uSwHIblIo4J3k432Zq689jcnvhYQjHFWza5uXwGA`, (c,d) => {
                    if (c == 200) {
                        File.writeTo(updatePath, d);
                        logger.warn(`新版本下载成功！准备重载插件……`);
                        mc.runcmd(`ll reload ${NAME}`);
                    } else {
                        logger.warn(`文件下载失败！请手动更新插件。`);
                    }
                });
            }
            break
        default:
            updateMSg = `检查更新失败！错误代码：${stat}`;
            logger.error(updateMSg);
            break
    }
});


logger.setConsole(true, 4);
logger.setFile(logPath, 5);
logger.setTitle(NAME);
setInterval(() => {
    logger.setFile(logPath, 5);
}, 30000); // 定时更新日志文件


class config {
    constructor () {
        this.elevators = [];
    }
}
let cfg = new config();
if (initFile(configPath, JSON.stringify(cfg, null, `\t`)) == false) {
    cfg = JSON.parse(File.readFrom(configPath));
}


class elevator {
    /**
     * 生成电梯方块配置
     * @param {string} block_id 方块命名空间
     * @param {number} max_floor 方块的最大楼层跨度
     */
    constructor (name, block_id, max_floor, allow_blocks_between) {
        this.name = name;
        this.block_id = block_id;
        this.max_floor = max_floor;
        this.allow_blocks_between = allow_blocks_between;
    }
}


/**
 * 获取格式化时间字符串
 * @param {boolean} ymd 是否包含年月日
 * @param {boolean} hms 是否包含时分秒
 * @returns {string} 格式化后的时间字符串
 */
 function formatDate (ymd = true, hms = true) {
    let date = system.getTimeObj();
    let d1 = `${date.Y}-${date.M}-${date.D}`;
    let d2 = `${date.h}:${date.m}:${date.s}`;
    let res = ``;
    if (ymd) res += d1;
    if (hms) res += d2;
    if (ymd && hms) res = d1 + d2;
    return res;
}

/**
 * 
 * @param {string} path 
 * @param {*} content 
 * @returns
 */
function initFile (path, content) {
    if (!File.exists(path)) {
        File.writeTo(path, content);
        return true
    }
    return false
}

function SAVE () {
    File.writeTo(configPath, JSON.stringify(cfg, null, `\t`));
}



let opCmd = mc.newCommand(`melevator`, `方块电梯设置`, PermType.GameMasters);
opCmd.setAlias(`mel`);

opCmd.setEnum(`actions`, [`new`, `remove`, `edit`]);
opCmd.optional(`action`, ParamType.Enum, `actions`, `actions`, 1);
opCmd.overload([`action`]);
opCmd.setCallback((cmd, ori, out, res) => {
    if (ori.player == null) return
    let pl = ori.player;

    switch (res.action) {
        case `new`:
            newGUI(pl);
            break
        case `remove`:
            removeGUI(pl);
            break
        case `edit`:
            editListGUI(pl);
            break
        default:
            mainGUI(pl);
            break
    }
});
opCmd.setup();


function mainGUI (pl) {
    let fm = mc.newSimpleForm();
    fm.setTitle(`${NAME} - 电梯方块设置`);

    fm.addButton(`新建电梯方块`);
    fm.addButton(`删除电梯方块`);
    fm.addButton(`编辑电梯方块`);

    pl.sendForm(fm, (pl, id) => {
        switch (id) {
            case 0:
                newGUI(pl);
                break
            case 1:
                removeGUI(pl);
                break
            case 2:
                editListGUI(pl);
                break
            default:
                break
        }
    });
}


function newGUI (pl) {
    let fm = mc.newCustomForm();
    fm.setTitle(`${NAME} - 添加电梯方块`);

    fm.addInput(`设置名称`);
    fm.addInput(`方块标准类型名`, `minecraft:`, `minecraft:`);
    fm.addInput(`最大垂直跨度（格）`, `请输入正整数`);
    fm.addSwitch(`是否禁止电梯方块之间存在其他方块`, true);

    pl.sendForm(fm, (pl, dt) => {
        if (dt == null) return
        if (getElvtBlockList().includes(dt[1])) {
            pl.sendModalForm(`${NAME} - 错误`, `已经存在关于方块${dt[1]}的设置！`, `去编辑`, `重新设置`, (pl, res) => {
                if (res) {
                    editGUI(pl, getElevator(dt[1]));
                } else {
                    newGUI(pl);
                }
            });
            return
        }

        let name = dt[0];
        let block_id = dt[1];
        let max_floor = Number.parseInt(dt[2]);

        let elvt = new elevator(name, block_id, max_floor, dt[3]);
        cfg.elevators.push(elvt);

        SAVE();
    });
}


function removeGUI (pl) {
    let fm = mc.newSimpleForm();
    fm.setTitle(`${NAME} - 移除电梯方块`);

    // elvtList = cfg.elevators;
    for (let i = 0; i < cfg.elevators.length; i++) {
        fm.addButton(cfg.elevators[i].name);
    }

    pl.sendForm(fm, (pl, id) => {
        if (id == null) return
        pl.sendModalForm(`${NAME} - 警告`, `确定删除电梯方块设置（${cfg.elevators[id].name}）？\n\n${cfg.elevators[id]}`, `确定`, `取消`, (pl, res) => {
            if (res) {
                cfg.elevators.splice(id, 1);
                SAVE();
                pl.sendModalForm(`${NAME} - 提示`, `操作成功！`, `继续编辑`, `关闭`, (pl, res) => {
                    if (res) {
                        mainGUI(pl);
                    }
                });
            } else {
                removeGUI(pl);
            }
        });
    });
}


function editListGUI (pl) {
    let fm = mc.newSimpleForm();
    fm.setTitle(`${NAME} - 编辑电梯方块`);

    // elvtList = cfg.elevators;
    for (let i = 0; i < cfg.elevators.length; i++) {
        fm.addButton(cfg.elevators[i].name);
    }

    pl.sendForm(fm, (pl, id) => {
        if (id == null) return

        editGUI(pl, cfg.elevators[id]);
    });
}


function editGUI (pl, elvt) {
    let fm = mc.newCustomForm();
    fm.setTitle(`${NAME} - 编辑电梯方块`);

    fm.addInput(`设置名称`, `名称`, elvt.name);
    fm.addInput(`方块标准类型名`, `minecraft:`, elvt.block_id);
    fm.addInput(`最大垂直跨度（格）`, `请输入正整数`, `${elvt.max_floor}`);
    fm.addSwitch(`是否禁止电梯方块之间存在其他方块`, elvt.allow_blocks_between);
    
    pl.sendForm(fm, (pl, dt) => {
        if (dt == null) return
        elvt.name = dt[0];
        elvt.block_id = dt[1];
        elvt.max_floor = Number.parseInt(dt[2]);
        elvt.allow_blocks_between = dt[3];
        cfg.elevators[getIndex(elvt)] = elvt;
        SAVE();

        pl.sendModalForm(`${NAME} - 提示`, `新的编辑已保存！`, `继续编辑`, `关闭`, (pl, res) => {
            if (res) {
                mainGUI(pl);
            }
        });
    });
}


mc.listen(`onJump`, (pl) => {
    /**
     * 玩家坐标
     */
    let plPos = pl.blockPos;
    let blPos = mc.newIntPos(plPos.x, plPos.y - 1, plPos.z, plPos.dimid);
    let bl = mc.getBlock(blPos);
    if (getElvtBlockList().includes(bl.type)) {
        let elvt = getElevator(bl.type);
        let obj = getUpperBlock(plPos, elvt);
        if (obj.found) {
            // pl.teleport(mc.newFloatPos(pl.pos.x, obj.targetPos.y, pl.pos.z, pl.pos.dimid));
            // pl.runcmd(`tp @s ~ ${obj.targetPos.y} ~`);
            mc.runcmdEx(`tp "${pl.realName}" ${pl.pos.x} ${obj.targetPos.y} ${pl.pos.z}`);
            logger.debug(`成功将玩家${pl.realName}传送至${obj.targetPos}（上行）`);
        } else {
            return
        }
    }
});


mc.listen(`onSneak`, (pl, is) => {
    if (is == false) return
    
    let plPos = pl.blockPos;
    let blPos = mc.newIntPos(plPos.x, plPos.y - 1, plPos.z, plPos.dimid);
    let bl = mc.getBlock(blPos)
    if (getElvtBlockList().includes(bl.type)) {
        let elvt = getElevator(bl.type);
        let obj = getLowerBlock(plPos, elvt);
        if (obj.found) {
            // pl.teleport(mc.newFloatPos(pl.pos.x, obj.targetPos.y, pl.pos.z, pl.pos.dimid));
            // pl.runcmd(`tp @s ~ ${obj.targetPos.y} ~`);
            mc.runcmdEx(`tp "${pl.realName}" ${pl.pos.x} ${obj.targetPos.y} ${pl.pos.z}`);
            logger.debug(`成功将玩家${pl.realName}传送至${obj.targetPos}（下行）`);
        } else {
            return
        }
    }
});

/**
 * 获取所有
 * @returns 
 */
function getElvtBlockList () {
    /**
     * @type {string[]}
     */
    let block_ids = [];
    for (let i = 0; i < cfg.elevators.length; i++) {
        block_ids.push(cfg.elevators[i].block_id);
    }

    return block_ids
}

/**
 * 
 * @param {string} blockType 
 * @returns {elevator | null}
 */
function getElevator (blockType) {
    for (let i = 0; i < cfg.elevators.length; i++) {
        if (cfg.elevators[i].block_id == blockType) {
            return cfg.elevators[i]
        }
    }
    return null
}

function getIndex (elvt) {
    for (let i = 0; i < cfg.elevators.length; i++) {
        if (cfg.elevators[i].block_id == elvt.block_id) {
            return i
        }
    }
    return null
}

/**
 * 
 * @param {IntPos} plPos 
 * @param {elevator} elevatorData 
 * @returns 
 */
function getUpperBlock (plPos, elevatorData) {
    /**
     * 遍历的方块对象
     * @type {Block}
     */
    let searchBl;
    /**
     * 寻找的方块标准类型名
     * @type {string}
     */
    let searchBlockType = elevatorData.block_id;
    /**
     * 遍历的坐标对象
     * @type {IntPos}
     */
    let searchPos;
    /**
     * 该维度最高建筑高度
     * @type {number}
     */
    let upMax;
    switch (plPos.dimid) {
        case 0: // main
            upMax = 320 - plPos.y;
            break
        case 1: // nether
            upMax = 128 - plPos.y;
            break
        case 2: // end
            upMax = 256 - plPos.y;
            break
        default:
            return {"found": false, "targetPos": null}
    }

    for (let i = 0; i <= upMax; i++) {
        searchPos = mc.newIntPos(plPos.x, plPos.y + i, plPos.z, plPos.dimid);
        searchBl = mc.getBlock(searchPos);

        if (searchBl == null) { // 空气
            continue
        } else if (searchBl.type == searchBlockType) { // 方块匹配
            if (i + 1 <= elevatorData.max_floor) { // 跨度符合
                let targetPos = mc.newFloatPos(searchBl.pos.x + 0.5, searchBl.pos.y + 1, searchBl.pos.z + 0.5, searchBl.pos.dimid);
                return {"found": true, "targetPos": targetPos}
            } else { // 跨度不符合
                return {"found": false, "targetPos": null}
            }
        } else { // 方块不匹配
            if (elevatorData.allow_blocks_between == true && searchBl.type != `minecraft:air`) {
                return {"found": false, "targetPos": null}
            }
            continue
        }
    }

    return {"found": false, "targetPos": null}
}

function getLowerBlock (plPos, elevatorData) {
    /**
     * 遍历的方块对象
     * @type {Block}
     */
    let searchBl;
    /**
     * 寻找的方块标准类型名
     * @type {string}
     */
    let searchBlockType = elevatorData.block_id;
    /**
     * 遍历的坐标对象
     * @type {IntPos}
     */
    let searchPos;
    /**
     * 该维度最高建筑高度
     * @type {number}
     */
    let downMax;
    switch (plPos.dimid) {
        case 0: // main
            downMax = plPos.y + 64;
            break
        case 1: // nether
            downMax = plPos.y;
            break
        case 2: // end
            downMax = plPos.y;
            break
        default:
            return {"found": false, "targetPos": null}
    }

    for (let i = 0; i <= downMax; i++) {
        searchPos = mc.newIntPos(plPos.x, plPos.y - i, plPos.z, plPos.dimid);
        searchBl = mc.getBlock(searchPos);

        if (searchBl == null) { // 空气 
            continue
        } else if (searchBl.type == searchBlockType) { // 方块匹配
            if (i <= elevatorData.max_floor + 1 && i != 1) { // 跨度符合
                let targetPos = mc.newFloatPos(searchBl.pos.x + 0.5, searchBl.pos.y + 1, searchBl.pos.z + 0.5, searchBl.pos.dimid);
                return {"found": true, "targetPos": targetPos}
            } else { // 跨度不符合
                if (i == 1) continue
                return {"found": false, "targetPos": null}
            }
        } else { // 方块不匹配
            if (elevatorData.allow_blocks_between == true && searchBl.type != `minecraft:air`) {
                return {"found": false, "targetPos": null}
            }
            continue
        }
    }
    
    return {"found": false, "targetPos": null}
}