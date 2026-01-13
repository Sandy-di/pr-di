<template>
  <view 
    class="svg-icon" 
    :style="{ 
      width: size, 
      height: size, 
      backgroundImage: iconData,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: 'contain'
    }"
  ></view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: '48rpx'
  },
  color: {
    type: String,
    default: '#ffffff'
  }
})

// SVG 路径字典
const icons: Record<string, string> = {
  piano: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5H20C21.1046 5 22 5.89543 22 7V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V7C2 5.89543 2.89543 5 4 5Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  ear: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 10V12C7 15.3137 9.68629 18 13 18H14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 12C11 14.2091 12.7909 16 15 16H16C17.6569 16 19 14.6569 19 13V11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11V14C3 16.2091 4.79086 18 7 18H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 13C16.8807 13 18 11.8807 18 10.5C18 9.11929 16.8807 8 15.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  mic: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C10.3431 2 9 3.34315 9 5V11C9 12.6569 10.3431 14 12 14C13.6569 14 15 12.6569 15 11V5C15 3.34315 13.6569 2 12 2Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 10V11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 18V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 22H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  settings: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 15C19.7828 14.0736 20 13.0644 20 12C20 10.9356 19.7828 9.92639 19.4 9M19.4 15L20.4 16.732C20.6599 17.1823 20.6122 17.7447 20.2741 18.1462L19.2741 19.3462C18.9189 19.7679 18.3308 19.9255 17.8038 19.7402L16 19.1M19.4 9L20.4 7.26795C20.6599 6.81768 20.6122 6.25529 20.2741 5.85381L19.2741 4.65381C5.08109 4.23206 5.66922 4.07447 6.19615 4.25979L8 4.9M4.6 9C4.21722 9.92639 4 10.9356 4 12C4 13.0644 4.21722 14.0736 4.6 15M4.6 9L3.6 7.26795C3.34005 6.81768 3.38781 6.25529 3.72595 5.85381L4.72595 4.65381C5.08109 4.23206 5.66922 4.07447 6.19615 4.25979L8 4.9M4.6 15L3.6 16.732C3.34005 17.1823 3.38781 17.7447 3.72595 18.1462L4.72595 19.3462C5.08109 19.7679 5.66922 19.9255 6.19615 19.7402L8 19.1M12 4C10.9356 4 9.92639 4.21722 9 4.6M12 4V2M15 4.6C14.0736 4.21722 13.0644 4 12 4M9 4.6L7.26795 3.6C6.81768 3.34005 6.25529 3.38781 5.85381 3.72595L4.65381 4.72595C4.23206 5.08109 4.07447 5.66922 4.25979 6.19615L4.9 8M15 4.6L16.732 3.6C17.1823 3.34005 17.7447 3.38781 18.1462 3.72595L19.3462 4.72595C19.7679 5.08109 19.9255 5.66922 19.7402 6.19615L19.1 8M12 20C13.0644 20 14.0736 19.7828 15 19.4M12 20V22M9 19.4C9.92639 19.7828 10.9356 20 12 20M15 19.4L16.732 20.4C17.1823 20.6599 17.7447 20.6122 18.1462 20.2741L19.3462 19.2741C19.7679 18.9189 19.9255 18.3308 19.7402 17.8038L19.1 16M9 19.4L7.26795 20.4C6.81768 20.6599 6.25529 20.6122 5.85381 20.2741L4.65381 19.2741C4.23206 18.9189 4.07447 18.3308 4.25979 17.8038L4.9 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  play: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3L19 12L5 21V3Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  pause: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 4H10V20H6V4Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 4H18V20H14V4Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  stop: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" stroke="currentColor" stroke-width="2"/></svg>`,
  
  record: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>`,
  
  home: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  back: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  metronome: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 18V2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 22L12 2L4 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="18" r="2" fill="currentColor"/></svg>`,
  
  'music-note': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18V5L21 3V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="16" r="3" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/></svg>`,
  
  grid: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/></svg>`,
  
  chart: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 20V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 20V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 20V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  lightning: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  'arrow-right': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 5L19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  more: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  
  share: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="5" r="3" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="12" r="3" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="19" r="3" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><path d="M8.59 13.51L15.42 17.49" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.41 6.51L8.59 10.49" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

const iconData = computed(() => {
  const svg = icons[props.name]
  if (!svg) return ''
  
  // 替换颜色 (处理 currentColor)
  const coloredSvg = svg.replaceAll('currentColor', props.color)
  
  // Base64 编码 (兼容微信小程序)
  // 小程序环境可能不支持 btoa 或 Buffer，使用 encodeURIComponent 方案
  const encoded = encodeURIComponent(coloredSvg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
    
  return `url("data:image/svg+xml,${encoded}")`
})
</script>

<style scoped>
.svg-icon {
  display: inline-block;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  /* 使用 mask 技术允许通过 background-color 染色 (仅限支持的浏览器/环境) */
  /* 如果只用 mask，那么颜色由 background-color 控制 */
  /* 这里我们直接修改了 SVG 源码颜色，所以用 background-image 即可 */
  /* 为了更好的兼容性，我们优先使用 background-image 方案 */
}
</style>
