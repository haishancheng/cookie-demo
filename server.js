var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]
var md5 = require('md5')

if (!port) {
  console.log('请指定端口号好不啦？\node server.js 8888 这样不会吗？')
  process.exit(1)
}

let sessions = {}

var server = http.createServer(function (request, response) {
  //以  http://localhost:8080/sss?wd=hello&rsv=rsv_spt#5   为例
  var parsedUrl = url.parse(request.url, true)
  var pathName = parsedUrl.pathname //pathName为路径，即为    /sss
  var queryObject = parsedUrl.query //queryObject为查询参数对象，即为   { wd: 'hello', rsv: 'rsv_spt' }
  var method = request.method

  if (pathName === '/') {
    let string = fs.readFileSync('./index.html', 'utf8')
    let cookies = ''
    if(request.headers.cookie){
      cookies =  request.headers.cookie.split('; ') // 可能会有多条cookie，以分号分割
    }
    let hash = {}
    for(let i =0;i<cookies.length; i++){
      let parts = cookies[i].split('=')
      let key = parts[0]
      let value = parts[1]
      hash[key] = value 
    }
    let mySession = sessions[hash.sessionId]//根据sessionId从sessions中取出email
    let email 
    if(mySession){
      email = mySession.sign_in_email
    }
    let users = fs.readFileSync('./db/users', 'utf8')
    users = JSON.parse(users)
    let foundUser
    for(let i=0; i< users.length; i++){
      if(users[i].email === email){
        foundUser = users[i]
        break
      }
    }
    if(foundUser){
      string = string.replace('__password__', foundUser.password)
    }else{
      string = string.replace('__password__', '不知道')
    }
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  } else if (pathName === '/sign_up' && method === 'GET') { //返回注册页面
    let string = fs.readFileSync('./sign_up.html', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  } else if (pathName === '/sign_up' && method === 'POST') {
    readBody(request).then((body) => {
      let strings = body.split('&') // ['email=1', 'password=2', 'password_confirmation=3']
      let hash = {}
      strings.forEach((string) => {
        // string == 'email=1'
        let parts = string.split('=') // ['email', '1']
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value) // url中的@符号会被40%来代替，所以需要将带@的字符串进行decodeURIComponent处理
      })
      let {
        email,
        password,
        password_confirmation
      } = hash
      if (email.indexOf('@') === -1) {
        response.statusCode = 400
        response.setHeader('Content-Type', 'application/json;charset=utf-8')
        response.write(`{
          "errors": {
            "email": "invalid"
          }
        }`)
      } else if (password !== password_confirmation) {
        response.statusCode = 400
        response.write('password not match')
      } else {
        var users = fs.readFileSync('./db/users', 'utf8')
        try {
          users = JSON.parse(users) // []
        } catch (exception) {
          users = []
        }
        let inUse = false
        for (let i = 0; i < users.length; i++) {
          let user = users[i]
          if (user.email === email) {
            inUse = true
            break;
          }
        }
        if (inUse) {
          response.statusCode = 400
          response.write('email in use')
        } else {
          users.push({
            email: email,
            password: password
          })
          var usersString = JSON.stringify(users)
          fs.writeFileSync('./db/users', usersString)
          response.statusCode = 200
        }
      }
      response.end()
    })
  } else if (pathName === '/sign_in' && method === 'GET') {
    let string = fs.readFileSync('./sign_in.html', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  } else if (pathName === '/sign_in' && method === 'POST') {
    readBody(request).then((body) => {
      let strings = body.split('&') // ['email=1', 'password=2', 'password_confirmation=3']
      let hash = {}
      strings.forEach((string) => {
        // string == 'email=1'
        let parts = string.split('=') // ['email', '1']
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value)
      })
      let {email,password} = hash
      var users = fs.readFileSync('./db/users', 'utf8')
      try {
        users = JSON.parse(users) // []
      } catch (exception) {
        users = []
      }
      let found
      for (let i = 0; i < users.length; i++) {
        if (users[i].email === email && users[i].password === password) {
          found = true
          break
        }
      }
      if (found) {
        // response.setHeader('Set-Cookie', `sign_in_email=${email}; max-age=60`)
        // response.setHeader('Set-Cookie', `sign_in_email=${email}; expires="Wed, 23 May 2018 09:16:33 GMT"`)
        let sessionId = Math.random() * 1000000
        sessions[sessionId] = {sign_in_email: email}
        response.setHeader('Set-Cookie', `sessionId=${sessionId};`)
        response.statusCode = 200
      } else {
        response.statusCode = 401
      }
      response.end()
    })
  } else if (pathName === '/js/main.js'){
    //使用ETag
    let string = fs.readFileSync('./js/main.js', 'utf8')
    response.setHeader('Content-Type', 'application/javascript; charset=utf8')
    let fileMd5 = md5(string)
    response.setHeader('ETag', fileMd5)
    if(request.headers['if-none-match'] === fileMd5){
      //main.js没有更新，没有响应体
      response.statusCode = 304
    } else{
      //有更新，再把新的内容返回
      response.write(string)
    }
    response.end()
  } else if (pathName === '/css/default.css'){
    //使用Cache-Control
    let string = fs.readFileSync('./css/default.css', 'utf8')
    response.setHeader('Content-Type', 'text/css; charset=utf8')
    response.setHeader('Cache-Control', 'max-age=300000000')//10年内使用缓存，不向服务器发送请求
    // response.setHeader('Expires', 'Thu, 24 May 2018 02:18:30 GMT')
    response.write(string)
    response.end()
  }else {
    response.statusCode = 404
    response.setHeader('Content-Type', 'text/plain;charset=utf-8')
    response.write('找不到对应路径')
    response.end()
  }
})

//得到post发送的数据，因为数据可能分多次发送，所以需要这样接受
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = []
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      resolve(body)
    })
  })
}

server.listen(port)
console.log('监听 ' + port + ' 成功\n请打开 http://localhost:' + port)