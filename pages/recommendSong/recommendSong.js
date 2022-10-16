// pages/recommendSong/recommendSong.js
import request from "../../utils/request";
import PubSub  from "pubsub-js";
Page({

    /**
     * 页面的初始数据
     */
    data: {
        day:'', //天
        month:'', //月
        recommendList:[], //推荐歌单
        index: 0, //标识点击音乐下标
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        //判断用户是否登录
        let userInfo = wx.getStorageSync('userInfo');
        if(!userInfo){
            wx.showToast({
                title:'请登录',
                icon:'none',
                success:()=>{
                    //跳转到登录页面
                    wx.relauch({
                        url:'/pages/login/login'
                    })
                }
            })
        }
        this.setData({
            //更新日期数据
            day:new Date().getDate(),
            month: new Date().getMonth() + 1
        })
        //获取每日推荐数据
        this.getRecommendList();

        //订阅来自songDetail页面的数据
        PubSub.subscribe('switchType',(msg,type) => {
            let {recommendList, index} = this.data;
            if(type === 'pre'){
                //当前index=0时,切换到最后一首
                (index === 0) && (index = recommendList.length);
                index -=1;
            }else{
                (index === recommendList.length -1) && (index = -1)
                index +=1;
            }

            //更新下标
            this.setData({
                index
            })
            let musicId = recommendList[index].id;
            //将musicId回传给songDetail页面
            PubSub.publish('musicId',musicId); 
        })
    },
    //获取用户每日推荐数据
    async getRecommendList(){
        let recommendListData = await request('/recommend/songs')
        this.setData({
            recommendList: recommendListData.data.dailySongs
        })
    },
    //跳转到songDetail页面
    toSongDetail(event){
        let {song,index} = event.currentTarget.dataset;
        this.setData({
            index
        })
        //路由跳转传参:query参数 url中不能有js对象，否则会自动调toStrinfg方法
        //不能将song对象作为参数传递,长度过长,会被自动截取掉，所以这里用id作为标识
        wx.navigateTo({
            // url:'/pages/songDetail/songDetail?song='+ JSON.stringify(song)
            url:'/pages/songDetail/songDetail?musicId='+ song.id
        })
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