// pages/songDetail/songDetail.js
import request from "../../utils/request";
import PubSub  from "pubsub-js";
import moment from "moment";
//获取全局实例
const appInstance = getApp();
Page({

    /**
     * 页面的初始数据
     */
    data: {
        isPlay:false,//标识音乐是否播放
        song:{},//歌曲详情对象
        musicId:'', //音乐id
        musicLink:'',//音乐链接
        currentTime:'00:00', //当前时间
        durationTime:'00:00', //总时长
        currentWidth:0, //实时长度
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        //options专门接收路由跳转的query参数
       let musicId = options.musicId;
       this.setData({
         musicId
       })
       this.getMusicInfo(musicId);
       //判断当前页面音乐是否在播放
       if(appInstance.globalData.isMusicPlay && appInstance.globalData.musicId === musicId){
        this.setData({
            isPlay:true
        })
       }
       //创建控制音乐播放的实例
       this.backgrorundAudioManager = wx.getBackgroundAudioManager()
       //监视音乐播放和暂停
       this.backgrorundAudioManager.onPlay(()=>{
        appInstance.globalData.musicId = musicId;
        this.changePlayState(true);
       });
       this.backgrorundAudioManager.onPause(()=>{
        this.changePlayState(false);
       }); 
       this.backgrorundAudioManager.onStop(()=>{
        this.changePlayState(false);
       });
       this.backgrorundAudioManager.onEnded(()=>{
        PubSub.publish('switchType','next');
        this.setData({
            currentWidth:0,
            currentTime:'00:00'
        })
       })
       //监听音乐实时播放的进度
       this.backgrorundAudioManager.onTimeUpdate(()=>{
        //格式化实时的播放时间
        let currentTime = moment(this.backgrorundAudioManager.currentTime*1000).format('mm:ss');
        let currentWidth = this.backgrorundAudioManager.currentTime/this.backgrorundAudioManager.duration *450;
        console.log(currentWidth);
        this.setData({
            currentTime,
            currentWidth
        })
       })
    },
       //修改播放状态的功能函数
    changePlayState(isPlay){
        //修改音乐是否播放还是暂停/停止
        this.setData({
            isPlay
        })
        //修改全局变量
        appInstance.globalData.isMusicPlay = isPlay;
       },
    //获取音乐详情的功能函数
    async getMusicInfo(musicId){
        let songData = await request('/song/detail',{ids:musicId});
        let durationTime = moment(songData.songs[0].dt).format('mm:ss');
        this.setData({
            song:songData.songs[0],
            durationTime
        })
        //动态修改窗口的标题
        wx.setNavigationBarTitle({
            title:this.data.song.name
        })
    },
    //点击播放/暂停的回调
    handleMusicPlay(){
        let isPlay = !this.data.isPlay;
        let {musicId,musicLink} = this.data
        this.musicControl(isPlay,musicId,musicLink);
    },
    //控制音乐播放/暂停的功能函数
    async musicControl(isPlay,musicId,musicLink){
        if(isPlay){
            if(!musicLink){
                //获取音乐播放链接
                let musicLinkData = await request('/song/url',{id:musicId})
                musicLink = musicLinkData.data[0].url;
                this.setData({
                    musicLink
                })
            }
            //播放音乐
            this.backgrorundAudioManager.src= musicLink;
            this.backgrorundAudioManager.title= this.data.song.name;
        }else{
            //暂停音乐
            this.backgrorundAudioManager.pause();
        }
    },
    //点击切歌的类型
    handleSwitch(event){
        //获取切歌的类型
        let type = event.currentTarget.id;
        //关闭当前播放的音乐
        this.backgrorundAudioManager.stop();
        //订阅来自recommendSong页面发布的musicId的信息
        PubSub.subscribe('musicId',(msg,musicId)=>{
            this.setData({
                musicId
              })
            //获取音乐详情信息
            this.getMusicInfo(musicId);
            //自动播放当前音乐
            this.musicControl(true,musicId);
            //取消订阅
            PubSub.unsubscribe('musicId');
        })
        //发布消息数据给recommendSong
        PubSub.publish('switchType',type);
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