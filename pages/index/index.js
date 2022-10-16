// pages/index/index.js
import request from'../../utils/request'
Page({

    /**
     * 页面的初始数据
     */
    data: {
        bannerList:[],//轮播图数据
        recommendList:[], // 推荐歌单
        topList:[], //排行榜数据
    },

    /**
     * 生命周期函数--监听页面加载
     */
    async onLoad(options) {
      let bannerListData = await request('/banner',{type:2});
      this.setData({
        bannerList:bannerListData.banners
      })
      //推荐歌单数据
      let recommendListData = await request('/personalized',{limit:10});
      this.setData({
        recommendList:recommendListData.result
      })
      // 获取排行榜数据
      let index = 0;
      let resultArr = [];
      while(index < 5){
        let topListData = await request('/playlist/detail',{id:24381614+index});
        index++;
        //splice(会修改原数组，可以对指定数组进行增删改) slice(不会修改原数组)
        let topListItem = {name:topListData.playlist.name,tracks:topListData.playlist.tracks.slice(0,3)};
        resultArr.push(topListItem);
        //更新topList的状态值
        this.setData({
          topList:resultArr
        })
      }
    },
    //跳转到每日推荐
    recommendDate(){
      wx.navigateTo({
        url:'/pages/recommendSong/recommendSong'
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