通过 cookie 来区分猫站
    猫站必须猫站的 url 加猫站的 cookie
    狗站不加 cookie
获取时间和商品信息后开始倒计时
    获取抢购时间
    获取 deadline
         + 28800000
做一个前端页面来触发事件和选择抢购商品
    先获取商品信息，再展示到前端
获取两个站的商品
点击开始
    1，在前端倒计时
       直接在页面倒计时，时间快到了再发送请求给 node
       不能关闭浏览器
    2，在后端倒计时
       收到开始请求后直接开始计时
       可关闭浏览器
       在 cmd 显示不直观
用方案 1 ，
    点击开始先从 node 获取服务器时间和抢购时间
    抢购时间有了，获取服务器时间
    把时间显示在页面
    时间快到了之后，发送加购物车请求给 node
    node 接收到商品信息后循环发送加购请求
        设置 cookie
    抢购结束后，发送请求获取结果
    抢购结束后重置结果信息
    获取查询结果后停止抢购
语言的限制， setInterval 间隔最小为 4 ms， 1 s 最多 250 次抢购
    用 for 循环代替 setInterval
    无法控制频率
    睡眠






var sleep = function(d) {
  for(var t = Date.now(); Date.now() - t <= d;);
}

var buyingNum = {
    add: (() => {
        this.sum = 0
        return () => {
            return ++this.sum
        }
    })(),
    init: () => {
        this.sum = 0
    },
    get: () => {
        return this.sum
    }
}
console.time();
var d = new Date().getTime()
var deadline = new Date(d + 1000).getTime()
for (var i = 0; i < 100000; i++) {
    var date = new Date().getTime()
    if (date > deadline) {
        break
    } else {
        sleep(1)
        buyingNum.add()
    }
}
console.timeEnd();
setTimeout(function() {
    console.log(buyingNum.get())
}, 1000)
