// pages/login/login.js
import request from "../../utils/request";
Page({

    /**
     * 页面的初始数据
     */
    data: {
        phone:'', //手机号
        password:'' //用户密码

    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {

    },
    //表单项内容发生变化的回调
    handleInput(event){
        let type = event.currentTarget.id;
        this.setData({
            [type]: event.detail.value
        })
      },

      //登录回调
      async login(){
        let {phone,password} = this.data;
        if(!phone){
            //提示用户
            wx.showToast({
                title:'手机号不能为空',
                icon: 'error'
            })

            return;
        }

        //定义正则表达式
        let phoneReg = /^1[3-9][0-9]{9}$/
        if(!phoneReg.test(phone)){
             //提示用户
             wx.showToast({
                title:'手机号格式错误',
                icon: 'error'
            })
            return;
        }
        if(!password){
             //提示用户
             wx.showToast({
                title:'密码不能为空',
                icon: 'error'
            })
            return;
        }

        //后端验证
        let result = await request('/login/cellphone',{phone,password,isLogin:true});
        if(result.code === 200){
          wx.showToast({
            title: '登陆成功',
          })
           //存储个人信息
            wx.setStorageSync('userInfo', JSON.stringify(result.profile))
            //从登录页返回个人中心页
            wx.reLaunch({
                url: '/pages/personal/personal'
            })
         
        }else if(result.code === 400){
          wx.showToast({
            title: '手机号错误',
            icon: 'none'
          })
        }else if(result.code === 502){
          wx.showToast({
            title: '密码错误',
            icon: 'none'
          })
        }else{
          wx.showToast({
            title: '登陆失败，请重新登录',
            icon: 'none'
          })
        }
      },
    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

    }
})