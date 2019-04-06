/*
1，获取服务器时间
2，获取商品信息
*/



const express = require('express')
const path = require('path')
const ajax = require('request')
// 解析网页数据(转为 dom 树) 语法类似 jquery
const cheerio = require('cheerio')
const bodyParser = require('body-parser')



const sendHtml = function(path, response) {
    //引入 fs 模块
    let fs = require('fs')
    //options 对象包含编码格式，用于 fs 读取文件
    let options = {
        encoding:'utf-8'
    }
    //fs.readFile 读取文件，1、路径，2、编码，3、回调(1、错误，2、内容)
    fs.readFile(path, options, function(err, data){
        //console.log(`读取的html文件 ${path} 内容是`, data)
        response.send(data)
    })
}

// 前端服务
let openFeServer = () => {
    const app = express()
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(express.static(path.join(__dirname, 'fe')))
    //主页
    app.get('/', (request, response) => {
        let path = './fe/index.html'
        sendHtml(path, response)
    })
    // 获取商品信息
    app.get('/goodsInfo', (request, response) => {
        getGoods().then(goodsInfo => {
            response.send(goodsInfo)
        })
    })
    // 获取服务器时间
    app.get('/getServiceTime', (request, response) => {
        getServiceTime().then(time => {
            response.send(time)
        })
    })
    // 加购物车
    app.post('/addToCart', (request, response) => {
        addToCart(request.body)
        response.send('收到加购请求')
    })
    // 开启监听
    let server = app.listen(80, function() {
        let host = server.address().address
        let port = server.address().port
        console.log('应用实例，访问地址为 http://%s:%s', host, port)
    })
}

// 格式化时间为 年月日 字符串
const timeFormat = (date, type) => {
    let y = date.getFullYear()
    let m = date.getMonth() + 1
    let d = date.getDate()
    let h = date.getHours()
    let mi = date.getMinutes()
    let s = date.getSeconds()
    if (String(m).length === 1) {
        m = '0' + m
    }
    if (String(d).length === 1) {
        d = '0' + d
    }
    if (String(h).length === 1) {
        h = '0' + h
    }
    if (String(mi).length === 1) {
        mi = '0' + mi
    }
    if (String(s).length === 1) {
        s = '0' + s
    }
    let result = `${y}.${m}.${d} ${h}:${mi}:${s}`
    if (type === 'YMD') {
        result = `${y}.${m}.${d}`
    } else if (type === 'HMS') {
        result = `${h}:${mi}:${s}`
    }
    return result
}

// 获取下一批抢购的时间
const getBuyingTime = () => {
    let date = new Date()
    let nowHours = date.getHours()
    let time = "10:00"
    if (nowHours < 10) {
        time = "10:00"
    } else if (nowHours >= 10 && nowHours < 11) {
        time = "11:00"
    } else if (nowHours >= 11 && nowHours < 12) {
        time = "12:00"
    } else if (nowHours >= 12 && nowHours < 14) {
        time = "14:00"
    } else if (nowHours >= 14 && nowHours < 16) {
        time = "16:00"
    } else if (nowHours >= 16 && nowHours < 18) {
        time = "18:00"
    } else if (nowHours >= 18 && nowHours < 20) {
        time = "20:00"
    } else if (nowHours >= 20 && nowHours < 22) {
        time = "22:00"
    }
    return time
}

// 获取服务器时间
const getServiceTime = () => {
    let randomCode = Math.random()
    let url = `https://www.epet.com/share/ajax.html?randomCode=${randomCode}`
    var promise = new Promise(function(resolve, reject) {
        ajax.post(url, function(err, res, body) {
            let date = res.headers.date
            let time = new Date(date).getTime()
            resolve(new Date(time))
        })
    })
    return promise
}

// 获取猫站的商品
const getCatGoods = (time) => {
    let promise = new Promise(function(resolve, reject) {
        let date = new Date()
        let deadline = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${time}:00`
        let url = 'https://cat.epet.com/share/activitys/suprise.html?do=getNewSurprise'
        // 请求这个批次的抢购商品信息
        let options = {
            url,
            formData: {time},
            headers: {
                'cookie': 'X15t_PET_TYPE=cat;',
            },
        }
        // 请求抢购商品的信息
        let goodsArr = []
        let request = ajax.post(options, function(error, response, body) {
                let $ = cheerio.load(body)
                let cut1 = $('.cut1')
                cut1.each((index, element) => {
                    let li = $(element).parent()
                    let goods = {
                        title: li.find('.goodsDes').text(),
                        imgSrc: li.find('img').attr('src'),
                        price: li.find('.ft20').text(),
                        gid: Number(li.find('.gid').val()),
                        atid: Number(li.find('.atid').val()),
                        deadline,
                    }
                    goodsArr.push(goods)
                })
                resolve(goodsArr)
            }
        )
    })
    return promise
}

// 获取狗站的商品
const getDogGoods = (time) => {
    let promise = new Promise(function(resolve, reject) {
        let date = new Date()
        let deadline = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${time}:00`
        let url = 'https://www.epet.com/share/activitys/suprise.html?do=getNewSurprise'
        // 请求这个批次的抢购商品信息
        let options = {
            url,
            formData: {time},
        }
        // 请求抢购商品的信息
        let goodsArr = []
        let request = ajax.post(options, function(error, response, body) {
                let $ = cheerio.load(body)
                let cut1 = $('.cut1')
                cut1.each((index, element) => {
                    let li = $(element).parent()
                    let goods = {
                        title: li.find('.goodsDes').text(),
                        imgSrc: li.find('img').attr('src'),
                        price: li.find('.ft20').text(),
                        gid: Number(li.find('.gid').val()),
                        atid: Number(li.find('.atid').val()),
                        deadline,
                    }
                    goodsArr.push(goods)
                })
                resolve(goodsArr)
            }
        )
    })
    return promise
}

// 获取商品信息
const getGoods = () => {
    let promise = new Promise(function(resolve, reject) {
        let time = getBuyingTime()
        getDogGoods(time).then(dogGoods => {
            getCatGoods(time).then(catGoods => {
                let goodsArr = dogGoods.concat(catGoods)
                resolve(goodsArr)
            })
        })
    })
    return promise
}

// 加购物车（被循环调用）
const addGoodsTocart = function (goodsInfo, url) {
    let opts = {
        gid: goodsInfo.gid,
        buytype: 'berserk',
        pam: goodsInfo.atid,
        pam1: `${goodsInfo.gid}|1`,
        show_cart: false,
        action: 'updatecart',
        inajax: '1',
        buynum: 1,
        tp: 'add',
        succeed_box: 1,
        hash: Math.random()
    }
    let request = ajax.get({url, qs: opts, json: true}, function(error, response, body) {
        console.log('body is', body);
    })

    return
    $.get(url, opts, function (res) {
        if (res.includes('已抢完')) {
            console.log('%c 商品已抢完，停止抢购~~~~~~~~~~','color:#666');
            // 延迟关闭请求
            setTimeout(function() {
                window.clearInterval(berserkTimer)
            }, 100)
        } else if (res.includes('抢购上限')) {
            console.log('%c 抢到了，15分钟内去付款！','background:#ccc;color:#f00;font-size:20px;');
            // 延迟关闭请求, 并跳转至购物车
            setTimeout(function() {
                window.clearInterval(berserkTimer)
            }, 100)
        } else {
            console.log(res);
        }
    })
}

// 开始循环加入购物车
const addToCart = function (goodsInfo) {
    let loopTime = parseInt(1000 / goodsInfo.frequency)
    var url = 'https://www.epet.com/share/ajax.html'
    berserkTimer =  setInterval(function () {
        addGoodsTocart(goodsInfo, url)
    }, loopTime)
}

const __main = () => {
    Promise.all([getServiceTime(), getGoods()]).then(value => {
        // 开启前端服务
        openFeServer()

        // let nowServiceTime = value[0]
        // let goodsArr = value[1]
        // let deadline = new Date(goodsArr[0].deadline)
        // let time_s = (deadline - nowServiceTime) / 1000
        // if (time_s < 0) {
        //     console.error('已经过了抢购时间~')
        //     return
        // }
        // // 因为下面的计时是 1 秒后才打印，所以 i 的初始值设为 1000 ms
        // let i = 1000
        // timer = setInterval(function() {
        //     // 每秒钟 剩余时间 -1
        //     time_s = time_s - 1
        //     // 如果快到时间了
        //     if (time_s <= 3) {
        //         addToCart(goodsArr)
        //         // 停止计时
        //         clearInterval(timer)
        //     } else {
        //         let nowTimestamp = new Date(nowServiceTime).getTime() + i
        //         i = i + 1000
        //         let nowTime = new Date(nowTimestamp)
        //         let text = `剩余${parseInt(time_s / 60)}分${parseInt(time_s % 60)}秒   &&  服务器时间为${timeFormat(nowTime, 'HMS')}`
        //         console.log(text)
        //     }
        // }, 1000)
    })
}

__main()
