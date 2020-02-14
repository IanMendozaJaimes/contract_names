import fs from 'fs'



function getTablesPrimaryKey(contract: string, text: string) {

	const table_pattern = /TABLE/g
	const primary_key_pattern = 'primary_key'
	let match = null
	let pos_primary_key = 0
	let return_pos = 0
	let pky = ''
	let res:any = {}

	res[contract] = {}

	do {

		match = table_pattern.exec(text)
		if(match){

			let i = match.index + 5
			let table_name_c = ''
			let table_abi_name = ''
			let aux_table_abi_name: any

			while(text[i] != '{'){

				table_name_c += text[i++]

			}

			table_name_c = table_name_c.replace(/[ ]/g, '')

			pos_primary_key = text.substring(++i, text.length).indexOf(primary_key_pattern) + i
			return_pos = text.substring(pos_primary_key, text.length).search(/return/) + pos_primary_key + ('return'.length)

			pky = ''
			i = return_pos
			while(text[i] != '.' && text[i] != ';'){
				pky += text[i++]
			}

			pky = pky.replace(/[ ]/g, '')

			let rgx = new RegExp("\"[a-zA-Z0-9.]*\"_n[ \n\t]*,[ \n\t]*" + table_name_c + "[ \n\t]*[,>]", "g")
			aux_table_abi_name = text.match(rgx)

			if(aux_table_abi_name){
				aux_table_abi_name = aux_table_abi_name[0]
				
				let j = 1
				table_abi_name = ''
				while(aux_table_abi_name[j] != '"'){
					table_abi_name += aux_table_abi_name[j++]
				}
			}

			res[contract][table_abi_name] = pky

		}

	} while(match)

	return res

}


function getContracts(text:string){

	const pattern = /name[ \n\t]*[a-zA-Z0-9]*[ \n\t]*=[ \n\t]*"[a-zA-Z0-9.]*"_n/g
	let match;
	let contracts = []

	while((match = pattern.exec(text))){
		let str = match[0]
		let cont = 0
		let i = 4
		let name = ''
		let contract = ''

		console.log(str)

		for(; i < str.length; i++){
			if(str[i] != "="){
				name += str[i]
			}
			else
				break
		}

		name = name.replace(/ /g, '')

		for(; i < str.length; i++){
			if(str[i] == '"')
				cont += 1
			else if(cont == 1){
				contract += str[i]
			}
			if(cont == 2)
				break
		}

		contracts.push([name, contract])

	}

	return contracts
}


function main(){

	if(process.argv.length <= 2){
		console.log('usage: ' + __filename + ' /path/to/directory')
		process.exit(-1)
	}

	let path = process.argv[2]
	let resultJSON:any = {}

	let exclude = new Set([
		'tables.hpp',
		'contracts.hpp',
		'utils.hpp',
		'abieos_numeric.hpp',
		'seeds.acctcreator.hpp'
	])

	if(path[path.length-1] == '/'){
		path = path.substring(0, path.length-1)
	}

	let contracts_text = fs.readFileSync(path+'/contracts.hpp').toString()
	let contracts = getContracts(contracts_text)

	fs.readdir(path, function(err, items){
		for(let i = 0; i < items.length; i++){
			if(exclude.has(items[i]))
				continue

			let data = fs.readFileSync(path+'/'+items[i]).toString()
			let contract = ''
			
			data = data.replace(/\[\[[ \n\t]*eosio::table[ \n\t]*\]\]/g, 'TABLE')
			
			for(let k = 0; k < contracts.length; k++){
				if(items[i].includes(contracts[k][0])){
					contract = contracts[k][1]
					break
				}
			}

			if(contract == '')
				continue


			let info = getTablesPrimaryKey(contract, data)
			resultJSON[contract] = info[contract]
		}
		

		fs.writeFile('contract_keys.json', JSON.stringify(resultJSON), (err) => {

			if(err) throw err

		})


	})

}


main()

