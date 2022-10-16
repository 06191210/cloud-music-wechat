// pages/video/video.js
import request from "../../utils/request";
Page({

    /**
     * 页面的初始数据
     */
    data: {
        videoGroupList:[], //导航标签数据
        navId:'',  //导航的id
        videoList:[], //视频
        videoId:'', //视频id标识
        videoUpdateTime:[], //记录video播放的时长
        isTriggered:false,//标识下拉刷新是否被触发

    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        //获取导航数据
        this.getViedoGroupListData();
    },
    //获取导航数据
    async getViedoGroupListData(){
        let videoGroupListData = await request('/video/group/list');
        this.setData({
            videoGroupList:videoGroupListData.data.slice(0,14),
            navId:videoGroupListData.data[0].id,
        })
        //获取视频列表数据
        this.getVideoList(this.data.navId);

    },
    
    async getVideoList(navId) {
        let videoListData = await request('/video/group', { id: navId });
        //关闭信息提示框
        wx.hideLoading();
        let index = 0
        let videoList = videoListData.datas.map(item => { item.id = index++; return item })
        // Url列表
        let videoUrlList = []
        // 获取Url
        for (let i = 0; i < videoList.length; i++) {
          let videoUrlItem = await request('/video/url', { id: videoList[i].data.vid })
          videoUrlList.push(videoUrlItem.urls[0].url)
        }
        // 将Url导入进videoList中
        for (let i = 0; i < videoUrlList.length; i++) {
          videoList[i].data.urlInfo = videoUrlList[i]
        }
        this.setData({
          videoList,
          isTriggered:false //关闭下拉框
        })
    },
    //点击切换导航的回调
    changeNav(event){
        let navId = event.currentTarget.id;
        this.setData({
            navId:navId*1
        })
        //显示正在加载
        wx.showLoading({
            title:'正在加载'
        })
        //动态获取当前导航对应的视频
        this.getVideoList(this.data.navId)
    },
    //解决多个视频播放问题
    handlePlay(event){
        let vid = event.currentTarget.id;
        //关闭上一个视频 
        this.vid !== vid && this.videoContext && this.videoContext.stop();
        this.vid = vid;
        //更新data中的videoId的在状态数据
        this.setData({
            videoId:vid
        })
        //创建控制video标签的实例对象
        this.videoContext = wx.createVideoContext(vid);
        //自动播放
        this.videoContext.play();
    },
    //自定义下拉刷新的回调
    handleRefresher(){
        //再次发请求，获取最新的视频列表数据
        this.getVideoList(this.data.navId);
    },
    //自定义上拉触底回调
    handleToLower(){

    },
    //用户点击分享
    onShareAppMessage({from}){
        console.log(from);
    },
    //跳转搜索页面
    toSearch(){
        wx.navigateTo({
            url:'/pages/search/search'
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