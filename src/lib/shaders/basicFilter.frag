// fragment shader for image filters and distortion effects
precision mediump float;
varying vec2 v;
uniform sampler2D u_image;

// Color filters
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturate;
uniform float u_hue;
uniform float u_grayscale;
uniform float u_sepia;
uniform float u_invert;

// Distortion effects
uniform float u_bulge;
uniform float u_pinch;
uniform float u_twist;
uniform float u_fisheye;
uniform float u_stretch;
uniform float u_squeeze;
uniform vec2 u_center; // Default center point for distortions (0.5, 0.5)

// from: https://gist.github.com/mjackson/5311256
vec3 rgb2hsl(vec3 c){
  float maxc=max(max(c.r,c.g),c.b),minc=min(min(c.r,c.g),c.b);
  float h=0., s=0., l=(maxc+minc)*0.5;
  if(maxc!=minc){
    float d=maxc-minc;
    s=l>0.5?d/(2.-maxc-minc):d/(maxc+minc);
    if(maxc==c.r)      h=(c.g-c.b)/d + (c.g<c.b?6.:0.);
    else if(maxc==c.g) h=(c.b-c.r)/d + 2.;
    else               h=(c.r-c.g)/d + 4.;
    h/=6.;
  }
  return vec3(h,s,l);
}

vec3 hsl2rgb(vec3 hsl){
  float h=hsl.x,s=hsl.y,l=hsl.z;
  float q=l<.5?l*(1.+s):l+s-l*s;
  float p=2.*l-q;
  float r=abs(mod(h*6.+6.,6.)-3.)-1.;
  float g=abs(mod(h*6.+4.,6.)-3.)-1.;
  float b=abs(mod(h*6.+2.,6.)-3.)-1.;
  r=clamp(r,0.,1.); g=clamp(g,0.,1.); b=clamp(b,0.,1.);
  r=r*r*(3.-2.*r); g=g*g*(3.-2.*g); b=b*b*(3.-2.*b);
  return mix(vec3(p),vec3(q),vec3(r,g,b));
}

// Distortion functions
vec2 bulge(vec2 uv, vec2 center, float strength) {
  // Move to center coordinate system
  vec2 delta = uv - center;
  float dist = length(delta);
  
  // Apply bulge formula
  float f = 1.0 + dist * strength;
  delta *= f;
  
  // Return to original coordinate system
  return center + delta;
}

vec2 pinch(vec2 uv, vec2 center, float strength) {
  // Move to center coordinate system
  vec2 delta = uv - center;
  float dist = length(delta);
  
  // Apply pinch formula (opposite of bulge)
  float f = 1.0 - dist * strength;
  delta *= f;
  
  // Return to original coordinate system
  return center + delta;
}

vec2 twist(vec2 uv, vec2 center, float strength) {
  // Move to center coordinate system
  vec2 delta = uv - center;
  float dist = length(delta);
  
  // Apply twist formula - rotate based on distance
  float angle = strength * dist;
  float sinAngle = sin(angle);
  float cosAngle = cos(angle);
  
  // Rotation matrix
  delta = vec2(
    delta.x * cosAngle - delta.y * sinAngle,
    delta.x * sinAngle + delta.y * cosAngle
  );
  
  // Return to original coordinate system
  return center + delta;
}

vec2 fisheye(vec2 uv, vec2 center, float strength) {
  // Move to center coordinate system
  vec2 delta = uv - center;
  float dist = length(delta);
  
  // Apply fisheye formula
  float r = pow(dist, 0.5) * strength;
  float theta = atan(delta.y, delta.x);
  
  // Convert back to Cartesian
  delta = r * vec2(cos(theta), sin(theta));
  
  // Return to original coordinate system
  return center + delta;
}

vec2 stretch(vec2 uv, vec2 center, float strength) {
  // Horizontal stretch
  vec2 delta = uv - center;
  delta.x *= 1.0 + strength;
  return center + delta;
}

vec2 squeeze(vec2 uv, vec2 center, float strength) {
  // Vertical stretch/horizontal squeeze
  vec2 delta = uv - center;
  delta.y *= 1.0 + strength;
  delta.x /= 1.0 + strength * 0.5;
  return center + delta;
}

void main() {
  // Apply distortion effects to get sampling coordinates
  vec2 uv = v;
  
  // Start with default coordinates
  vec2 distortedUV = uv;
  
  // Apply distortion effects if any are active
  if (u_bulge != 0.0) {
    distortedUV = bulge(distortedUV, u_center, u_bulge);
  }
  
  if (u_pinch != 0.0) {
    distortedUV = pinch(distortedUV, u_center, u_pinch);
  }
  
  if (u_twist != 0.0) {
    distortedUV = twist(distortedUV, u_center, u_twist);
  }
  
  if (u_fisheye != 0.0) {
    distortedUV = fisheye(distortedUV, u_center, u_fisheye);
  }
  
  if (u_stretch != 0.0) {
    distortedUV = stretch(distortedUV, u_center, u_stretch);
  }
  
  if (u_squeeze != 0.0) {
    distortedUV = squeeze(distortedUV, u_center, u_squeeze);
  }
  
  // Clamp to avoid sampling outside texture bounds
  distortedUV = clamp(distortedUV, 0.0, 1.0);
  
  // Sample texture with distorted coordinates
  vec4 col = texture2D(u_image, distortedUV);

  // Apply color filters
  
  // Brightness and Contrast
  col.rgb *= u_brightness;
  col.rgb = (col.rgb-.5)*u_contrast+.5;

  // Hue Rotate and Saturate
  vec3 hsl = rgb2hsl(col.rgb);
  hsl.x += u_hue / 360.0; // hue in [0, 1]
  hsl.y *= u_saturate;
  col.rgb = hsl2rgb(hsl);

  // Grayscale
  float g = dot(col.rgb, vec3(.2126, .7152, .0722));
  col.rgb = mix(col.rgb, vec3(g), u_grayscale);

  // Sepia (applied on top of grayscale if both are present)
  col.rgb = mix(col.rgb,
            vec3(dot(col.rgb, vec3(.393, .769, .189)),
                 dot(col.rgb, vec3(.349, .686, .168)),
                 dot(col.rgb, vec3(.272, .534, .131))),
            u_sepia);

  // Invert (applied last)
  col.rgb = mix(col.rgb, vec3(1.0) - col.rgb, u_invert);

  gl_FragColor = col;
} 