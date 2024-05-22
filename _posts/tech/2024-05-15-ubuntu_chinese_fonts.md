---
title: '解决Ubuntu中文字体缺失，中文文档丑'
date: 2024-05-15
permalink: /posts/2024/05/ubuntu_chinese_fonts
categories: tech
---

Ubuntu下使用WPS, LibreOffice编辑文档、演示稿时，发现Ubuntu自带的（免费）字体丑。同样的文档在Windows，MAC下看着没问题，在Ubuntu下排版都乱了（字体宽度不一样）。将Windows的中文字体拷过来就好了。


将C:Windows\Fonts下的truetype字体（ttc ttf后缀）拷到ubuntu的/usr/share/fonts/truetype目录下，已将Windows字体上传至https://github.com/xoofee/chinese_fonts

# 安装步骤
```bash
git clone https://github.com/xoofee/chinese_fonts
sudo cp chinese_fonts/* /usr/share/fonts/truetype/
sudo fc-cache -f -v
```

# 确认字体已拷到目标目录
```bash
/usr/share/fonts/truetype$ ls *.ttf *.ttc
Dengb.ttf     msyhl.ttc     STHUPO.ttf
Dengl.ttf     msyh.ttc      STKAITI.ttf
Deng.ttf      simfang.ttf   STLITI.ttf
FZSTK.ttf     simhei.ttf    STSONG.ttf
FZYTK.ttf     simkai.ttf    STXIHEI.ttf
mingliub.ttc  SIMLI.ttf     STXINGKA.ttf
msjhbd.ttc    simsun.ttc    STXINWEI.ttf
msjhl.ttc     SIMYOU.ttf    STZHONGS.ttf
msjh.ttc      STCAIYUN.ttf
msyhbd.ttc    STFANGSO.ttf
```

可以看到（不免费的）微软雅黑msyh