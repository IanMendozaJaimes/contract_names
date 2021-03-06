"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
function getTablesPrimaryKey(contract, text) {
    var table_pattern = /TABLE/g;
    var primary_key_pattern = 'primary_key';
    var match = null;
    var pos_primary_key = 0;
    var return_pos = 0;
    var pky = '';
    var res = {};
    res[contract] = {};
    do {
        match = table_pattern.exec(text);
        if (match) {
            var i = match.index + 5;
            var table_name_c = '';
            var table_abi_name = '';
            var aux_table_abi_name = void 0;
            while (text[i] != '{') {
                table_name_c += text[i++];
            }
            table_name_c = table_name_c.replace(/[ ]/g, '');
            pos_primary_key = text.substring(++i, text.length).indexOf(primary_key_pattern) + i;
            return_pos = text.substring(pos_primary_key, text.length).search(/return/) + pos_primary_key + ('return'.length);
            pky = '';
            i = return_pos;
            while (text[i] != '.' && text[i] != ';') {
                pky += text[i++];
            }
            pky = pky.replace(/[ ]/g, '');
            var rgx = new RegExp("\"[a-zA-Z0-9.]*\"_n[ \n\t]*,[ \n\t]*" + table_name_c + "[ \n\t]*[,>]", "g");
            aux_table_abi_name = text.match(rgx);
            if (aux_table_abi_name) {
                aux_table_abi_name = aux_table_abi_name[0];
                var j = 1;
                table_abi_name = '';
                while (aux_table_abi_name[j] != '"') {
                    table_abi_name += aux_table_abi_name[j++];
                }
            }
            res[contract][table_abi_name] = pky;
        }
    } while (match);
    return res;
}
function getContracts(text) {
    var pattern = /name[ \n\t]*[a-zA-Z0-9]*[ \n\t]*=[ \n\t]*"[a-zA-Z0-9.]*"_n/g;
    var match;
    var contracts = [];
    while ((match = pattern.exec(text))) {
        var str = match[0];
        var cont = 0;
        var i = 4;
        var name_1 = '';
        var contract = '';
        console.log(str);
        for (; i < str.length; i++) {
            if (str[i] != "=") {
                name_1 += str[i];
            }
            else
                break;
        }
        name_1 = name_1.replace(/ /g, '');
        for (; i < str.length; i++) {
            if (str[i] == '"')
                cont += 1;
            else if (cont == 1) {
                contract += str[i];
            }
            if (cont == 2)
                break;
        }
        contracts.push([name_1, contract]);
    }
    return contracts;
}
function main() {
    if (process.argv.length <= 2) {
        console.log('usage: ' + __filename + ' /path/to/directory');
        process.exit(-1);
    }
    var path = process.argv[2];
    var resultJSON = {};
    var exclude = new Set([
        'tables.hpp',
        'contracts.hpp',
        'utils.hpp',
        'abieos_numeric.hpp',
        'seeds.acctcreator.hpp'
    ]);
    if (path[path.length - 1] == '/') {
        path = path.substring(0, path.length - 1);
    }
    var contracts_text = fs_1.default.readFileSync(path + '/contracts.hpp').toString();
    var contracts = getContracts(contracts_text);
    fs_1.default.readdir(path, function (err, items) {
        for (var i = 0; i < items.length; i++) {
            if (exclude.has(items[i]))
                continue;
            var data = fs_1.default.readFileSync(path + '/' + items[i]).toString();
            var contract = '';
            data = data.replace(/\[\[[ \n\t]*eosio::table[ \n\t]*\]\]/g, 'TABLE');
            for (var k = 0; k < contracts.length; k++) {
                if (items[i].includes(contracts[k][0])) {
                    contract = contracts[k][1];
                    break;
                }
            }
            if (contract == '')
                continue;
            var info = getTablesPrimaryKey(contract, data);
            resultJSON[contract] = info[contract];
        }
        fs_1.default.writeFile('contract_keys.json', JSON.stringify(resultJSON), function (err) {
            if (err)
                throw err;
        });
    });
}
main();
