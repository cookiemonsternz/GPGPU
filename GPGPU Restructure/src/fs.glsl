precision mediump float;

uniform mat4 invMatrix; // inverse matrix, to revert from model to world space (kinda)
uniform vec3 lightPosition; // Direction of directional light source
uniform vec3 eyeDirection; // Direction of the camera
uniform vec4 ambientColor; // Ambient color
// uniform sampler2D texture; // Texture sampler
varying vec3 vPosition;
varying vec3 vNormal;
varying vec4 vColor;
varying vec2 vTextureCoord;

void main() {
    vec3 lightVec = lightPosition - vPosition;
    vec3 invLight = normalize(invMatrix * vec4(lightVec, 0.0)).xyz;
    vec3 invEye = normalize(invMatrix * vec4(eyeDirection, 0.0)).xyz;
    vec3 halfLE = normalize(invLight + invEye);
    float diffuse = clamp(dot(vNormal, invLight), 0.0, 1.0);
    float specular = pow(clamp(dot(vNormal, halfLE), 0.0, 1.0), 50.0);
    // vec4 textureColor = texture2D(texture, vTextureCoord); // Mix this into dest color if using texture
    vec4 dest_color = vColor * vec4(vec3(diffuse), 1.0) + vec4(vec3(specular), 1.0) + ambientColor;
    gl_FragColor = dest_color; // Set the fragment color to white
    // HI
    // Bye
}
// void main(void){
//     vec3  lightVec  = lightPosition - vPosition;
//     vec3  invLight  = normalize(invMatrix * vec4(lightVec, 0.0)).xyz;
//     vec3  invEye    = normalize(invMatrix * vec4(eyeDirection, 0.0)).xyz;
//     vec3  halfLE    = normalize(invLight + invEye);
//     float diffuse   = clamp(dot(vNormal, invLight), 0.0, 1.0) + 0.2;
//     float specular  = pow(clamp(dot(vNormal, halfLE), 0.0, 1.0), 50.0);
//     vec4  destColor = vColor * vec4(vec3(diffuse), 1.0) + vec4(vec3(specular), 1.0) + ambientColor;
//     gl_FragColor    = destColor;
// }