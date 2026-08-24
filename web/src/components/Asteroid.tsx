'use client'
import {useEffect, useRef} from 'react'
import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {gunzipHex} from '@/lib/mesh'

interface Props {
    vertices: string
    faces: string
    size?: number
    interactive?: boolean
}

export default function Asteroid({vertices, faces, size = 150, interactive = false}: Props) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        let dead = false
        let frame = 0
        let renderer: THREE.WebGLRenderer | null = null
        let controls: OrbitControls | null = null
        let geo: THREE.BufferGeometry | null = null
        ;(async () => {
            const [vBuf, fBuf] = await Promise.all([gunzipHex(vertices), gunzipHex(faces)])
            if (dead) return
            geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vBuf), 3))
            geo.setIndex(new THREE.BufferAttribute(new Uint16Array(fBuf), 1))
            geo.computeVertexNormals()
            geo.center()
            geo.computeBoundingSphere()
            const r = geo.boundingSphere?.radius ?? 1

            const scene = new THREE.Scene()
            const camera = new THREE.PerspectiveCamera(38, 1, r / 10, r * 10)
            camera.position.set(r * 1.6, r * 1.1, r * 2.2)
            camera.lookAt(0, 0, 0)

            scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc8bb, 1.25))
            const key = new THREE.DirectionalLight(0xffffff, 1.5)
            key.position.set(3, 4, 5)
            scene.add(key)

            const mesh = new THREE.Mesh(
                geo,
                new THREE.MeshStandardMaterial({color: 0xcabb9f, roughness: 0.88, metalness: 0.04, flatShading: true})
            )
            scene.add(mesh)

            renderer = new THREE.WebGLRenderer({antialias: true, alpha: true})
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            renderer.setSize(size, size)
            renderer.domElement.style.opacity = '0'
            renderer.domElement.style.transition = 'opacity 300ms'
            el.replaceChildren(renderer.domElement)

            if (interactive) {
                controls = new OrbitControls(camera, renderer.domElement)
                controls.enableDamping = true
                const loop = () => {
                    if (dead) return
                    controls!.update()
                    renderer!.render(scene, camera)
                    frame = requestAnimationFrame(loop)
                }
                loop()
            } else {
                renderer.render(scene, camera)
            }
            requestAnimationFrame(() => {
                if (!dead && renderer) renderer.domElement.style.opacity = '1'
            })
        })()
        return () => {
            dead = true
            cancelAnimationFrame(frame)
            controls?.dispose()
            renderer?.dispose()
            geo?.dispose()
            el.replaceChildren()
        }
    }, [vertices, faces, size, interactive])
    return <div ref={ref} style={{width: size, height: size}} />
}
