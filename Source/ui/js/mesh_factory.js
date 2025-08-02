// effectively MeshFactory is an Abstract Factory base class
// that defers specific configuration to subclasses like SphereFactory
// since all meshes require a geometry and material,
// the more concrete subclasses are responsible for configuring their own geometry and material,
// for example, the SphereFactory() constructor has a default geometry of
// 'sphere' and a default material of 'standard'
export default class MeshFactory {
    #THREE;

    // for documentation purposes.
    // subclasses will implement this method
    // to provide default options for material and geometry initialization
    static defaultOptions(environmentMap) {
        return {};
    }

    // for THREE.Mesh(), a geometry and material are required
    // a mesh factory should return a Mesh() which requires a THREE.Geometry(), and a THREE.MeshMaterial() 
    // the type of mesh should be delegated to the subclass of MeshFactory,
    // removing the need for conditional logic to determine type of mesh to return
    // a mesh factory requires an already imported three module
    // a mesh factory should be initialized with options for:
    // 1.) a material, and 2.) a geometry
    // these can be contained in one `options` object fed to the constructor
    constructor(threeModule, options, geo, mat) {
        this.#THREE = threeModule;
        this.options = options;
        this.geometry = this.getGeometry(geo);
        this.material = this.getMaterial(mat);
    }

    // Options passed as object for MeshMaterial from subclassed factory,
    // e.g. SphereFactory, PlaneFactory, BoxFactory, LineFactory, with their class specific defaults.
    // Options passed as array for Geometry from subclassed factory with their class specific defaults.
    // mat and geo are strings representing the desired type of material, and geometry, respectively.
    // so to create surroundingCube, mat = 'physical',
    // to create sphere, mat = 'standard',
    // this allows for other material types to be added later to the materials object below
    getMaterial(mat) {
        const materials = {
            // MeshMaterial() constructor takes an object
            'standard': new this.#THREE.MeshStandardMaterial(this.options['material']),
            'physical': new this.#THREE.MeshPhysicalMaterial(this.options['material']),
        };
        return materials[mat];
    }

    getGeometry(geo) {
        const geometries = {
            // Geometry() constructor takes argument list, spread args list using `...`
            'box': new this.#THREE.BoxGeometry(...this.options['geometry']),
            'sphere': new this.#THREE.SphereGeometry(...this.options['geometry']),
            'plane': new this.#THREE.PlaneGeometry(...this.options['geometry'])
        }

        return geometries[geo];
    }

    generateMesh(position) {
        const mesh = new this.#THREE.Mesh(this.geometry, this.material);
        mesh.position.copy(position);
        return mesh;
    }
}
