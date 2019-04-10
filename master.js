/**
*/


const fs = require('fs')
const childProcess = require('child_process')
const express = require('express')
const path = require('path')
const ajax = require('request')
const cheerio = require('cheerio')
const bodyParser = require('body-parser')



const sendHtml = function(path, response) {
    let options = {
        encoding:'utf-8'
    }
    fs.readFile(path, options, function(err, data){
        response.send(data)
    })
}

// 前端服务
const openFeServer = () => {
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
    })
    // 接收子进程的抢购结果信息
    app.post('/sendResult', (request, response) => {
        let res = request.body
        console.log('子进程传来的结果', res);
        if (res.result.includes('抢到了')) {
            buyingResult.set('抢到了，15分钟内去付款！！！')
        }
        buyingNum.add(res.num)
        response.send('收到结果信息')
    })
    // 接收子进程的 log 信息
    app.post('/log', (request, response) => {
        let res = request.body
        console.log('子进程的log：', res);
        response.send('收到结果信息')
    })
    // 开启监听
    let server = app.listen(80, function() {
        let host = server.address().address
        let port = server.address().port
        console.log(`==================请在浏览器地址栏输入 127.0.0.1 打开=================`)
    })
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
        return (n) => {
            if (n) {
                this.sum += Number(n)
                return this.sum
            }
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

// 通知子进程抢购
const addToCart = function (goodsInfo) {
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
    let body = {
        url: 'https://www.epet.com/share/ajax.html',
        qs: qs,
        json: true,
        headers: {
            'cookie': `X15t_PETTYPE_SWITCH_TIP=1; X15t_mycityid=32860; X15t_ssid=4OOp8IJ6BBl0BbiZ; _ga=GA1.2.520273905.1548986198; X15t_mall_uid=4400883; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22168a6c5a42e71e-0232bc5b2e9-5e1d3712-2073600-168a6c5a42f6d7%22%2C%22%24device_id%22%3A%22168a6c5a42e71e-0232bc5b2e9-5e1d3712-2073600-168a6c5a42f6d7%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_referrer_host%22%3A%22%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%7D%7D; X15t_mywid=1; X15t_location_place=20_37916_37925; X15t_gott_auth=eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1NTMzMTcxMTYsInVzZXIiOnsidWlkIjo0NDAwODgzLCJhY0lkIjozNDY5NDQ0NjUyODMzMzgyNCwibmFtZSI6IuS4u-S6ul9JT2k3N0Y3SlduIn0sImlhdCI6MTU1MzMxMzUxNn0.8-L4OH3-upWg4E1GkL-hj9bvFt5Xun1GwoICM4v_TkQ; X15t_gott_auth_refresh=eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1NTU5MDU1MTYsInVzZXIiOnsidWlkIjo0NDAwODgzLCJhY0lkIjozNDY5NDQ0NjUyODMzMzgyNCwibmFtZSI6IuS4u-S6ul9JT2k3N0Y3SlduIn0sImlhdCI6MTU1MzMxMzUxNn0.aKME0Qef1hPEygqLA0hBsbUqQcJmIWTs0ssRBQoPlAg; acw_tc=b73c9f2015543688861992683e0f33fe2809ad6ea6987c6de729a00d9d; X15t_appcode_4400883=1; X15t_views_his=110711%2C172420%2C259113%2C172424; _gid=GA1.2.887393918.1554687877; X15t_cart_num=0; X15t_PET_TYPE=cat; Hm_lvt_46b764c8f191469d8f1df15610466406=1554515952,1554687877,1554773464,1554861601; Hm_lvt_8dcd0895e4efc2d51b880622aa21832f=1554515952,1554687877,1554773465,1554861601; PHPSESSID=dh0dmc8iidmd29fo6agc7vfhpf; Hm_lpvt_8dcd0895e4efc2d51b880622aa21832f=1554861645; Hm_lpvt_46b764c8f191469d8f1df15610466406=1554861645`,
        },
    }
    // 通知子进程抢购
    for (let i = 0; i < workers.length; i++) {
        let worker = workers[i]
        let port = worker.spawnargs[2]
        let options = {
            url: `http://127.0.0.1:${port}/addToCart`,
            form: goodsInfo,
        }
        // 发送商品信息给子进程
        ajax.post(options, (err, res, body) => {})
    }
}

const workers = []

const __main = () => {
    //创建 4 个子进程
    // for (let i = 0; i < 4; i++) {
    //     var port = 8080 + i
    //     let workerProcess = childProcess.exec(`node app.js ${port}`, function(error, stdout, stderr) {
    //         if (error) {
    //             console.log(error.stack)
    //             console.log('Error code: ' + error.code)
    //             console.log('Signal received: ' + error.signal)
    //         }
    //         console.log('子进程输出', stdout);
    //     })
    //     workerProcess.on('exit', function(code) {
    //         console.log('子进程已退出，退出码 ' + code)
    //     })
    // }

    // 开启前端服务
    openFeServer()
    // 创建 4 个子进程
    for (let i = 0; i < 4; i++) {
        let port = 8080 + i
        let workerProcess = childProcess.fork('./app.js', [port])
        workers.push(workerProcess)
    }
}

__main()
