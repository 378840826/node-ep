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
        buyingResult.init()
        buyingNum.init()
        response.send('收到加购请求')
    })
    // 获取抢购结果
    app.get('/getResult', (request, response) => {
        let res = '抢了' + buyingNum.get() + '次；' + buyingResult.get()
        response.send(res)
        // 获取结果了，说明超过抢购时间了，停止抢购
        clearInterval(berserkTimer)
    })
    // 开启监听
    let server = app.listen(80, function() {
        let host = server.address().address
        let port = server.address().port
        console.log('请在浏览器地址栏输入 127.0.0.1 打开')
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
    let promise = new Promise(function(resolve, reject) {
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

// 存储抢购结果信息
let buyingResult = {
    init: () => {
        this.result = '没抢到~~'
    },
    set: (result) => {
        this.result = result
    },
    get: () => {
        return this.result
    },
}

// 抢购次数信息
let buyingNum = {
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

// 加购物车（被循环调用）
const addGoodsTocart = function (goodsInfo, url) {
    let qs = {
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
    let options = {
        url,
        qs: qs,
        json: true,
        headers: {
            'cookie': `X15t_PETTYPE_SWITCH_TIP=1; X15t_ssid=K2cs2MZcuGxkYbBC; X15t_mycityid=32860; _ga=GA1.2.737129787.1548597395; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%221688f98fc535bb-0b33953d36548-5b452a1d-2073600-1688f98fc54799%22%2C%22%24device_id%22%3A%221688f98fc535bb-0b33953d36548-5b452a1d-2073600-1688f98fc54799%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_referrer_host%22%3A%22%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%7D%7D; X15t_mywid=58; X15t_location_place=15_29761_29762; X15t_appcode_0=1; X15t_appcode_4571546=1; X15t_appcode_4400883=1; X15t_gott_auth=eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1NTM5NjkyNzAsInVzZXIiOnsidWlkIjo0MzI3NTI3LCJhY0lkIjozMjc5NTgxOTk1NDQxNzY2NCwibmFtZSI6IuS4u-S6ul9nVThqOW5zU2Z1In0sImlhdCI6MTU1Mzk2NTY3MH0.crExXkO_FRXve08Mhv6AH3vU-nd2rGIOF-DA1fgXr0k; X15t_gott_auth_refresh=eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1NTY1NTc2NzAsInVzZXIiOnsidWlkIjo0MzI3NTI3LCJhY0lkIjozMjc5NTgxOTk1NDQxNzY2NCwibmFtZSI6IuS4u-S6ul9nVThqOW5zU2Z1In0sImlhdCI6MTU1Mzk2NTY3MH0.F6XZgu2nbHymaiT4ewDvs9Z4msJlFm16L6ebx22_TpI; X15t_mall_uid=4327527; X15t_cs_auth=mJeVm2iXm22UsWTZu5s; acw_tc=b7f033a515540331760508058eb77a85cfb954ed0a005d433a2de5da69; X15t_search_keyword_his=%E5%8D%9A%E5%A3%AB%E7%8C%AB%E7%A0%82%2C%E9%93%81%E9%94%A4%2Ckong%2C%E6%B5%B7%E6%B4%8B%E4%B9%8B%E6%98%9F; X15t_views_his=156372%2C156374%2C238655%2C239183%2C238653%2C239466%2C238650%2C220490%2C239465%2C172878; _gid=GA1.2.359709335.1554211349; X15t_appcode_4327527=1; X15t_cart_num=0; X15t_PET_TYPE=cat; Hm_lvt_46b764c8f191469d8f1df15610466406=1554429075,1554436915,1554470159,1554514622; Hm_lvt_8dcd0895e4efc2d51b880622aa21832f=1554429075,1554436915,1554470159,1554514622; Hm_lpvt_8dcd0895e4efc2d51b880622aa21832f=1554560725; _gat_gtag_UA_114983884_1=1; Hm_lpvt_46b764c8f191469d8f1df15610466406=1554560725`,
        },
    }
    let request = ajax.get(options, function(error, response, body) {
        buyingNum.add()
        body = body || ''
        if (body.includes('已抢完')) {
            // 延迟关闭请求
            setTimeout(function() {
                clearInterval(berserkTimer)
            }, 50)
        } else if (body.includes('抢购上限')) {
            buyingResult.set('抢到了，15分钟内去付款！')
            // 延迟关闭请求, 并跳转至购物车
            setTimeout(function() {
                clearInterval(berserkTimer)
            }, 50)
        }
    })
}

// 开始循环加入购物车
const addToCart = function (goodsInfo) {
    let loopTime = parseInt(1000 / goodsInfo.frequency)
    let url = 'https://www.epet.com/share/ajax.html'
    berserkTimer =  setInterval(function () {
        addGoodsTocart(goodsInfo, url)
    }, loopTime)
}

const __main = () => {
    // 开启前端服务
    openFeServer()
}

__main()
