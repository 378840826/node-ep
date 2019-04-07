/**
 * @Date:   2019-04-06T16:04:54+08:00
 * @Filename: index.js
 */



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

// 创建商品 html
const createGoods = function(goodsInfoArr) {
    let html = ''
    for (let i = 0; i < goodsInfoArr.length; i++) {
        let goodsInfo = goodsInfoArr[i]
        html += `
         <span class="span-goods">
             <div class="goods-img">
                 <img src="${goodsInfo.imgSrc}">
             </div>
             <div class="goods-title">${goodsInfo.title}</div>
             <div class="goods-number">
                 <span class="span-goods-price">
                     价格: <span class="goods-price">${goodsInfo.price}</span>
                 </span>
                 <span class="span-goods-gid">
                     gid: <span class="goods-gid">${goodsInfo.gid}</span>
                 </span>
                 <span class="span-goods-atid">
                     atid: <span class="goods-atid">${goodsInfo.atid}</span>
                 </span>
                 <span class="span-deadline">
                     抢购时间: <span class="goods-deadline">${goodsInfo.deadline}</span>
                 </span>
             </div>
         </span>`
    }
    return html
}

// 获取商品并渲染
const getGoods = () => {
    $.get('/goodsInfo', (response) => {
        let container = document.querySelector('.div-goods-container')
        let html = createGoods(response)
        container.innerHTML = html
    })
}

const removeClassAll = (className, scopeElement) => {
    let selector = '.' + className
    let elements
    if (scopeElement) {
        elements = scopeElement.querySelectorAll(selector)
    } else {
        elements = document.querySelectorAll(selector)
    }
    for (let i = 0; i < elements.length; i++) {
        let e = elements[i]
        e.classList.remove(className)
    }
}

// 点击商品自动填充
const bindClickGoodsImg = () => {
    // 商品点击自动填充
    let container = document.querySelector('.div-goods-container')
    container.addEventListener('click', function(event) {
        let target = event.target
        let goodsSpan = target.closest('.span-goods')
        let scopeElement = document.querySelector('.div-goods-container')
        removeClassAll('active', scopeElement)
        goodsSpan.classList.add('active')
        let goods = target.closest('.span-goods')
        let gid = goods.querySelector('.goods-gid').innerText
        let atid = goods.querySelector('.goods-atid').innerText
        let deadline = goods.querySelector('.goods-deadline').innerText
        let title = goods.querySelector('.goods-title').innerText
        document.querySelector('#id-gid').value = gid
        document.querySelector('#id-atid').value = atid
        document.querySelector('#id-deadline').value = deadline
        document.querySelector('#id-title').innerText = title
        // 启用开始按钮
        document.querySelector('.popup-btn').classList.remove('disabled')
    })
}

// 点击开始抢购
const bindClickStart = () => {
    let popupBtn = document.querySelector('.popup-btn')
    popupBtn.addEventListener('click', function() {
        let gid = document.querySelector('#id-gid').value
        let atid = document.querySelector('#id-atid').value
        let deadline = document.querySelector('#id-deadline').value
        let title = document.querySelector('#id-title').innerText
        let frequency = document.querySelector('#id-frequency').value
        let speedinessTime = document.querySelector('#id-speedinessTime').value
        if (gid === '' || atid === '' || deadline === '') {
            document.querySelector('.p-error').innerText = '开启前先点击图片选择商品'
            return
        }
        let goods = {
            gid: Number(gid),
            atid: Number(atid),
            deadline: deadline,
            title: title,
            frequency: Number(frequency),
            speedinessTime: Number(speedinessTime),
        }
        // 发送请求给 node，获取服务器时间
        $.get('/getServiceTime', goods, (res, textStatus, jqXHR) => {
            let nowServiceTime = new Date(res)
            let deadline = new Date(goods.deadline)
            // let deadline = new Date('2019-04-06 17:24:30')
            let time_s = (deadline - nowServiceTime) / 1000
            // 如果过了抢购时间了
            if (time_s < 0) {
                let errorContainer = document.querySelector('.p-error')
                errorContainer.innerText = '已经过了抢购时间~'
                return
            }
            // 因为下面的计时是 1 秒后才打印，所以 i 的初始值设为 1000 ms
            let i = 1000
            timer = setInterval(function() {
                // 每秒钟 剩余时间 -1
                time_s = time_s - 1
                // 如果快到时间了
                if (time_s <= speedinessTime) {
                    addToCart(goods)
                    // 等抢购结束，查询抢购结果
                    getResult(speedinessTime)
                    // 停止计时
                    clearInterval(timer)
                } else {
                    let nowTimestamp = new Date(nowServiceTime).getTime() + i
                    i = i + 1000
                    let nowTime = new Date(nowTimestamp)
                    let text = `剩余${parseInt(time_s / 60)}分${parseInt(time_s % 60)}秒   &&  服务器时间为${timeFormat(nowTime, 'HMS')}`
                    console.log(text)
                    let timeContainer = document.querySelector('.p-log')
                    timeContainer.innerText = text
                }
            }, 1000)
            popupBtn.classList.add('disabled')
        })
    })
}

// 查询抢购结果
const getResult = (speedinessTime) => {
    let time = (Number(speedinessTime) + 2) * 1000
    setTimeout(() => {
        console.log('查询结果');
        $.get('/getResult', (res) => {
            let timeContainer = document.querySelector('.p-log')
            timeContainer.innerText = res
            // 启用抢购按钮
            $('.popup-btn.disabled').removeClass('disabled')
        })
    }, time)
}

// 请求加入购物车
const addToCart = (goods) => {
    console.log('加购物车', goods);
    $.post('/addToCart', goods, function(res) {
        document.querySelector('.p-log').innerText = '开始抢'
    })
}

// 点击重新获取商品
const bindGetGoods = () => {
    let btn = document.querySelector('#id-getGoods')
    btn.addEventListener('click', getGoods)
}

const bindEvents = () => {
    bindGetGoods()
    bindClickGoodsImg()
    bindClickStart()
}

const __main = () => {
    getGoods()
    bindEvents()
}

__main()
