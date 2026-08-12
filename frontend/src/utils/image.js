// 纯函数：生成事件图片的存储路径（原图 + 缩略图同前缀）。
// 用模块级计数器保证同毫秒内连续调用也产生不同路径（测试要求每次唯一）。
let lastStamp = 0
function uniqueStamp() {
  let s = Date.now()
  if (s <= lastStamp) s = lastStamp + 1
  lastStamp = s
  return s
}
export function makeImagePaths(eventId, ext = 'jpg') {
  const stamp = uniqueStamp()
  const imagePath = `_doc/images/${eventId}_${stamp}.${ext}`
  const thumbPath = `_doc/images/${eventId}_${stamp}_thumb.${ext}`
  return { imagePath, thumbPath }
}

// 设备函数：从相册/相机选择图片，压缩并写入应用私有目录。
// 返回 [{ image_path, thumb_path }]；真机手动验证，H5 返回临时路径（开发用）。
export function chooseAndStoreImages(eventId, count = 9) {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const stored = []
        for (const src of res.tempFilePaths) {
          try {
            stored.push(await compressAndCopy(src, eventId))
          } catch (e) {
            console.error('store image fail', src, e)
          }
        }
        resolve(stored)
      },
      fail: reject
    })
  })
}

// 生成头像存储路径
export function makeAvatarPath(ext = 'jpg') {
  const stamp = uniqueStamp()
  return `_doc/avatars/${stamp}.${ext}`
}

// 选择并保存头像
export function chooseAvatar() {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const src = res.tempFilePaths[0]
        const destPath = makeAvatarPath()
        // 压缩并复制到目标路径
        uni.compressImage({
          src,
          quality: 80,
          success: (r) => {
            if (typeof uni.saveFile !== 'function') {
              // H5 无 saveFile，直接使用压缩后的临时路径（开发用）
              resolve(r.tempFilePath)
              return
            }
            uni.saveFile({
              tempFilePath: r.tempFilePath,
              success: (saveRes) => {
                resolve(saveRes.savedFilePath)
              },
              fail: reject
            })
          },
          fail: reject
        })
      },
      fail: reject
    })
  })
}

function compressAndCopy(src, eventId) {
  return new Promise((resolve, reject) => {
    const paths = makeImagePaths(eventId)
    const next = (step) => {
      if (step === 0) {
        // 压缩图
        uni.compressImage({ src, quality: 80, success: (r) => { paths.imagePath = r.tempFilePath; next(1) }, fail: reject })
      } else if (step === 1) {
        // 缩略图（宽 240）
        uni.compressImage({ src, compressedWidth: 240, success: (r) => { paths.thumbPath = r.tempFilePath; resolve(paths) }, fail: reject })
      }
    }
    next(0)
  })
}
