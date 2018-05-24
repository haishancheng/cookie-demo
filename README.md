# 模拟cookie的过程

## 启动应用

`node server.js 8888`

或者

`node server 8888`

## 测试cookie&session

1. 网站首页是http://127.0.0.1:8080，未登录状态下看见的是 __你的密码是：不知道__
2. 进入登录页面http://127.0.0.1:8080/sign_up ,进行注册
3. 然后进入登录页面http://127.0.0.1:8080/sign_in ,进行登录
4. 之后在访问http://127.0.0.1:8080 ，就能看见自己的密码了

## 测试cache-control
修改server.js中路由/css/default.css中的Cache-Control的max-age，观察开发者工具中的NetWork

## 测试etag
修改js/main.js中的内容，观察开发者工具中的NetWork
