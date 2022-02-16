
 const util = require("util");
 const querystr = require("querystring");

module.exports = {
  async uploadXml(indata, holder) {
    console.log('uploadXml data='+indata)


    const arr = indata.split('\n');
    let symbolTypeList = 0;
    const arrTypeList = [];
    let symbolVarList = 0;
    const arrVarList = [];

    arr.forEach(line => {
      if (line.indexOf('SymbolTypeList>') > 0) {
        symbolTypeList = line.indexOf('/SymbolTypeList>') > 0 ? 0 : 1;
        
      } else if (line.indexOf('SymbolVarList>') > 0) {
        symbolVarList = line.indexOf('/SymbolVarList>') > 0 ? 0 : 1;
        
      } else if (symbolTypeList) {
        if (line.indexOf('TypeSimple') > 0) arrTypeList.push(line);
        
      } else if (symbolVarList) {
        if (line.indexOf('Var') > 0) arrVarList.push(line);
      }
    });

    // ['<TypeSimple TypeId="0" Size="4">REAL</TypeSimple>',...]
    //   => {<TypeId>: {TypeId:"0", Size:"4", typeName:"REAL"}
    const typeListObj = {};
    for (const line of arrTypeList) {
      const typeName = cData(line);
      if (!typeName) continue;
      const varr = line.match(/<TypeSimple([^>]*)/);
      if (!varr || varr.length < 2) continue;

      const resObj = qParse(varr[1]);
      if (resObj && resObj.TypeId) typeListObj[resObj.TypeId] = { ...resObj, typeName };
    }
    
    // ['<Var Type="0" Flags="64" Access="98" RefId="4" Offset="152">PLC_PRG.a</Var>',..]
    //  => [{Type:"0", Flags:"64", Access:"98", RefId:"4", Offset:"152", varName:'PLC_PRG.a'}, ...]
    const varArray = [];
    for (const line of arrVarList) {
      const varName = cData(line);
      if (!varName) continue;
      const varr = line.match(/<Var([^>]*)/);
      if (!varr || varr.length < 2) continue;

      const resObj = qParse(varr[1]);
      if (resObj && resObj.Type) varArray.push({ ...resObj, Type: typeListObj[resObj.Type].typeName, varName });
    }
 

    const data = [{id:'X1',chan:'X1'}, {id:'X2',chan:'X2'},
    {id:'X11',chan:'X11'}, {id:'X21',chan:'X21'}];
    holder.emit('receive:plugin:channels', {unit:'swe1', data});
    return {response: 1, message:'Загружено 42 канала'};

    function cData(line) {
      const xarr = line.match(/>(.*)<\//);
      return xarr && xarr.length > 1 ?  xarr[1] : '';
    }
  
    function qParse(qstr) {
      const xstr = qstr.split('"').join('');
      return querystr.parse(xstr, ' ', '=');
    }  
  }
}