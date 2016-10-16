/**
 * Fun with strings
 */

const path = require('path')
const fs = require('fs')
const args = process.argv
const readline = require('readline')
const Stream = require('stream')

if (!args[2]) {
  console.log('No scripthelp2 file specified pelase provide one as argument')
  process.exit()
}

var shFile = path.normalize(args[2])

if (!path.isAbsolute(shFile)) {
  shFile = path.join(__dirname, '..', shFile)
}

try {
    // append extensions (scripthelp_ext.txt)
  var shExtPath = path.join(__dirname, '..', 'scripthelp_ext.txt')
  fs.writeFileSync(shFile, fs.readFileSync(shFile, 'utf8') + '\n\n\n' + fs.readFileSync(shExtPath, 'utf8'), 'utf8')
} catch (e) {
  console.log('Provided file doesn\'t exist!')
  process.exit()
}

const classFuncsPath = path.join(__dirname, 'classfuncs.json')
const librariesPath = path.join(__dirname, 'libraries.json')
const globalsPath = path.join(__dirname, 'globals.json')
const constantsPath = path.join(__dirname, 'constants.json')

console.log('Clearing exsiting data:')
console.log(classFuncsPath)
fs.writeFileSync(classFuncsPath, '', 'utf8')

console.log(librariesPath)
fs.writeFileSync(librariesPath, '', 'utf8')

console.log(globalsPath)
fs.writeFileSync(globalsPath, '', 'utf8')

console.log(constantsPath)
fs.writeFileSync(constantsPath, '', 'utf8')

var instream = fs.createReadStream(shFile)
var outstream = new Stream()
var rl = readline.createInterface(instream, outstream)

const STATE_HEADER = 1
const STATE_RETURN = 2
const STATE_PARAM = 4
const STATE_CONSTANT = 8
const STATE_NONE = 64

const COLON = ':'
const SPACE = ' '
const DOT = '.'
const COMMA = ','
const SLASH = '/'
const HASH_SIGN = '#'
const EMPTY_STRING = ''
const NO_DESCRIPTION = 'No Description'
const API_BASE_URL = 'https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Scripting/API'

const LABEL_GLOBAL = 'Global'
const LABEL_CLASSFUNC = 'Class-Function'
const LABEL_LIBARY = 'Libary'

const TYPE_METHOD = 'method'
const TYPE_CONSTANT = 'constant'
const TYPE_FUNCTION = 'function'
const TYPE_CLASS = 'class'

const HEADER_IDENTIFIER = '---[['
const HEADER_CLOSE = ']]'

const RETURN_IDENTIFIER = '-- @return'
const PARAM_IDENTIFIER = '-- @param'

const CONSTANT_IDENTIFIER = '---'
const CONSTANT_IDENTIFIER_SOFT = 'Enum'

const LIBARIES = {
  CEntities: {
    accessor: 'Entities',
    description: 'Provides functions for creating and finding entities in the game.'
  },
  CDOTA_PlayerResource: {
    accessor: 'PlayerResource',
    description: 'Used to get and set data for players in-game.'
  },
  CScriptParticleManager: {
    accessor: 'ParticleManager',
    description: 'Used to create, modify and remove Particles.'
  },
  CScriptHeroList: {
    accessor: 'HeroList',
    description: 'Provides functions for retrieving heroes in the current game.'
  },
  CDOTAGameruels: {
    accessor: 'GamerRules',
    description: 'Used to get and modify gamerules.'
  },
  Convars: {
    accessor: 'ConVars',
    description: 'ConVars store information on the client and server that can be accessed using the developer console. ConVar is short for "console variable". Sometimes it is also spelled like "CVar".'
  },
  CCustomGameEventManager: {
    accessor: 'CustomGameEventManager',
    description: 'Used to  send events from server-to-client and client-to-server.'
  },
  CCustomNetTableManager: {
    accessor: 'CustomNetTables',
    description: 'Provides functions to access the serverside nettables.'
  },
  CDOTATutorial: {
    accessor: 'Tutorial',
    description: 'Provides functions used in Dota2\'s tutorials'
  },
  Vector: {
    accessor: 'Vector',
    description: 'Creates a Vector object.',
    snippet: 'Vector(${1:float x},${2:float y},${3:float z})',
    forceClassFunc: true
  }
}

var currentState = STATE_NONE

var classFuncs = []
var libraries = {}
var globals = {}
var constants = []

var currentACLObj = {}

function inState (state) {
  return state & currentState
}

rl.on('line', function (line) {
  if (line.includes(HEADER_IDENTIFIER)) {
    currentState = STATE_HEADER

    currentACLObj = {}
    currentACLObj.params = []

    var temp = line.replace(HEADER_IDENTIFIER, EMPTY_STRING)
    temp = temp.replace(HEADER_CLOSE, EMPTY_STRING)

    currentACLObj.displayText = temp.trim().split(SPACE)[0]
    currentACLObj.name = currentACLObj.displayText
    currentACLObj.rightLabel = LABEL_GLOBAL
    currentACLObj.type = TYPE_FUNCTION

        // if class function
    if (currentACLObj.displayText.includes(COLON)) {
      currentACLObj.rightLabel = LABEL_CLASSFUNC
      currentACLObj.name = currentACLObj.displayText.split(COLON)[1]
      currentACLObj.type = TYPE_METHOD
    }

    currentACLObj.description = temp.replace(currentACLObj.displayText, EMPTY_STRING).trim()

    if (!currentACLObj.description) {
      currentACLObj.description = NO_DESCRIPTION
    }

    return
  }

  if (inState(STATE_HEADER | STATE_RETURN) && line.includes(RETURN_IDENTIFIER)) {
    currentState = STATE_RETURN

    var returnType = line.replace(RETURN_IDENTIFIER, EMPTY_STRING).trim()

    if (!currentACLObj.leftLabel) {
      currentACLObj.leftLabel = returnType
    } else {
      currentACLObj.leftLabel = currentACLObj.leftLabel + COMMA + returnType
    }

    return
  }

  if (inState(STATE_RETURN | STATE_PARAM) && line.includes(PARAM_IDENTIFIER)) {
    currentState = STATE_PARAM

    var parramArr = line.replace(PARAM_IDENTIFIER, EMPTY_STRING).trim().split(SPACE)
    currentACLObj.params.push({
      name: parramArr[0],
      type: parramArr[1]
    })

    return
  }

  if (inState(STATE_NONE) && line.includes(CONSTANT_IDENTIFIER)) {
    currentACLObj = {}
    currentACLObj.rightLabel = line.replace(CONSTANT_IDENTIFIER, EMPTY_STRING).replace(CONSTANT_IDENTIFIER_SOFT, EMPTY_STRING).trim()
    currentACLObj.type = TYPE_CONSTANT
    currentState = STATE_CONSTANT

    return
  }

  if (inState(STATE_CONSTANT) && line.trim() !== EMPTY_STRING) {
    var constantObj = Object.assign({}, currentACLObj)

    var lineArr = line.trim().split(SPACE)

    constantObj.name = lineArr[0]
    constantObj.snippet = lineArr[0]

    if (lineArr[4]) {
      constantObj.description = lineArr.splice(4).join(' ')
    }

    if (constantObj.description) {
      constantObj.description = constantObj.description + ' Numeric value: ' + lineArr[2]
    } else {
      constantObj.description = 'Numeric value: ' + lineArr[2]
    }

    constantObj.descriptionMoreURL = API_BASE_URL + HASH_SIGN + currentACLObj.rightLabel

    constants.push(constantObj)

    return
  }

  if (line.trim() === EMPTY_STRING) {
    if (inState(STATE_PARAM | STATE_RETURN)) {
            // create snippet
      var paramStr = ''

      for (var i = 0; i < currentACLObj.params.length; i++) {
        if (i === 0) {
          paramStr = '${' + (i + 1) + COLON + currentACLObj.params[i].type + ' ' + currentACLObj.params[i].name + '}'
        } else {
          paramStr = paramStr + COMMA + '${' + (i + 1) + COLON + currentACLObj.params[i].type + SPACE + currentACLObj.params[i].name + '}'
        }
      }

      currentACLObj.params = null
      delete currentACLObj.params

      currentACLObj.snippet = currentACLObj.name + '(' + paramStr + ')'

      if (LIBARIES[currentACLObj.displayText.split(COLON)[0]]) {
        var libName = currentACLObj.displayText.split(COLON)[0]
        var libData = LIBARIES[libName]
        var accessorVar = libData.accessor
        currentACLObj.descriptionMoreURL = API_BASE_URL + SLASH + currentACLObj.displayText.replace(COLON, DOT)
        currentACLObj.displayText = currentACLObj.displayText.replace(libName, accessorVar)
        if (!libraries[accessorVar]) {
          libraries[accessorVar] = {
            funcs: [],
            name: accessorVar,
            snippet: libData.snippet || accessorVar,
            displayText: accessorVar,
            description: libData.description,
            rightLabel: LABEL_LIBARY,
            type: TYPE_CLASS
          }
        }
        libraries[accessorVar].funcs.push(currentACLObj)
        if (libData.forceClassFunc) {
          classFuncs.push(currentACLObj)
        }
      } else if (currentACLObj.rightLabel === LABEL_GLOBAL) {
        currentACLObj.descriptionMoreURL = API_BASE_URL + SLASH + LABEL_GLOBAL + DOT + currentACLObj.name
        globals[currentACLObj.name] = currentACLObj
      } else {
        currentACLObj.descriptionMoreURL = API_BASE_URL + SLASH + currentACLObj.displayText.replace(COLON, DOT)
        classFuncs.push(currentACLObj)
      }
    }
    currentState = STATE_NONE
  }
})

rl.on('close', function () {
  console.log('Writing new data:')
  console.log(classFuncsPath)
  fs.writeFileSync(classFuncsPath, JSON.stringify(classFuncs), 'utf8')

  console.log(librariesPath)
  fs.writeFileSync(librariesPath, JSON.stringify(libraries), 'utf8')

  console.log(globalsPath)
  fs.writeFileSync(globalsPath, JSON.stringify(globals), 'utf8')

  console.log(constantsPath)
  fs.writeFileSync(constantsPath, JSON.stringify(constants), 'utf8')
})
