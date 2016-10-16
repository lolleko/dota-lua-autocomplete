var fs = require('fs')

// Globals
var globalSuggestions
var globalKeys

// ClassFuncs
var classFuncSuggestions

// LibaryFuncs
var libSuggestions

var constantSuggestions

var getEditDistance = function (a, b) {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  var matrix = []

    // increment along the first column of each row
  var i
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

    // increment each column in the first row
  var j
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

    // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1)) // deletion
      }
    }
  }

  return matrix[b.length][a.length]
}

var sortSuggestionsByLength = function (suggestions, prefix) {
  return suggestions.sort(function (a, b) {
    return getEditDistance(a.name, prefix) - getEditDistance(b.name, prefix)
  })
}

module.exports = {
  selector: '.source.lua',
  disableForSelector: '.source.lua .comment, .string',

  inclusionPriority: 1,
  excludeLowerPriority: false,

  activate: function () {
    globalSuggestions = JSON.parse(fs.readFileSync(__dirname + '/globals.json', 'utf8'))
    globalKeys = Object.keys(globalSuggestions)

    classFuncSuggestions = JSON.parse(fs.readFileSync(__dirname + '/classfuncs.json', 'utf8'))

    libSuggestions = JSON.parse(fs.readFileSync(__dirname + '/libraries.json', 'utf8'))

    constantSuggestions = JSON.parse(fs.readFileSync(__dirname + '/constants.json', 'utf8'))
  },

  getPrefix: function (editor, bufferPos) {
    var classRegex = new RegExp(':([^()\n]*)$')
    var libRegex = new RegExp('(?:(' + Object.keys(libSuggestions).join('|') + '))\:([^()\n]*)$')

    var line = editor.getTextInRange([
            [bufferPos.row, 0], bufferPos
    ])

    // lib funcs
    var match = line.match(libRegex)
    if (match) {
      return match
    }

    // class funcs
    match = line.match(classRegex)
    if (match) {
      return match
    }

    return ''
  },

  getSuggestions: function (arg) {
    var editor = arg.editor
    var bufferPosition = arg.bufferPosition

    var otherPrefix = this.getPrefix(editor, bufferPosition)
    var prefix = otherPrefix || arg.prefix

    return new Promise(function (resolve) {
      var suggestions = []

      if (typeof prefix !== 'string') {
        if (libSuggestions[prefix[1]]) {
          var libary = libSuggestions[prefix[1]]
          libary.funcs.forEach(function (item) {
            if (item.name.toLowerCase().includes(prefix[2].toLowerCase())) {
              var suggestion = Object.assign({}, item)
              suggestion.replacementPrefix = prefix[2]
              suggestions.push(suggestion)
            }
          })
          return resolve(sortSuggestionsByLength(suggestions, prefix[1]))
        }
        if (prefix[0].length > 3) {
          classFuncSuggestions.forEach(function (item) {
            if (item.name.toLowerCase().includes(prefix[1].toLowerCase())) {
              var suggestion = Object.assign({}, item)
              suggestion.replacementPrefix = prefix[1]
              suggestions.push(suggestion)
            }
          })
          return resolve(sortSuggestionsByLength(suggestions, prefix[1]))
        }
      } else if (prefix.length > 2) {
        globalKeys.forEach(function (key) {
          if (key.toLowerCase().includes(prefix.toLowerCase())) {
            suggestions.push(Object.assign({}, globalSuggestions[key]))
          }
        })
        for (var libName in libSuggestions) {
          if (libName.toLowerCase().includes(prefix.toLowerCase())) {
            var libObj = Object.assign({}, libSuggestions[libName])
            delete libObj.funcs
            suggestions.push(libObj)
          }
        }
        if (prefix.substring(0, 3).toUpperCase() === prefix.substring(0, 3)) {
          constantSuggestions.forEach(function (item) {
            if (item.name.toLowerCase().includes(prefix.toLowerCase())) {
              suggestions.push(Object.assign({}, item))
            }
          })
        }
      }
      return resolve(sortSuggestionsByLength(suggestions, prefix))
    })
  },

  dispose: function () {}
}
