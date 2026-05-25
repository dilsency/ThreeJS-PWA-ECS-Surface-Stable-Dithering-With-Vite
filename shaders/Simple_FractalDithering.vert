precision highp float;

in vec3 position;
in vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

out vec2 vUv;
out vec4 vClipPos;

void main() {
    vUv = uv;
    vClipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = vClipPos;
}
