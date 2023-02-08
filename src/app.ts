/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import * as MRE from "@microsoft/mixed-reality-extension-sdk";
import * as _ from "lodash";

type ButtonName =
	| "$5"
	| "$10"
	| "$20"
	| "$50"
	| "$100"
	| "Other"
	| "FIELD"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| "+"
	| "0"
	//| "⌫"
	//| "←"
	| "<-"
	| "Ok"
	| "Back"
	| "Reset"
	| "Fill out a Connect card"
	| "Connect to our Discord server"
	| "Support the ministry";

type ButtonDef = {
	name: ButtonName;
	row: number;
	col: number;
	width: number;
	action: (self: VRGiving, user: MRE.User) => void;
};

type Page = {
	title: string;
	blurb: string;
	buttons: ButtonName[];
	init: (self: VRGiving) => void;
};

const cache: { [key: string]: string } = {};

const buttonDefs: ButtonDef[] = [
	{ name: "$5", row: 0, col: 0, width: 1, action(self) { self.amountButton(this); } },
	{ name: "$10", row: 0, col: 1, width: 1, action(self) { self.amountButton(this); } },
	{ name: "$20", row: 0, col: 2, width: 1, action(self) { self.amountButton(this); } },
	{ name: "$50", row: 1, col: 0, width: 1, action(self) { self.amountButton(this); } },
	{ name: "$100", row: 1, col: 1, width: 1, action(self) { self.amountButton(this); } },
	{ name: "Other", row: 1, col: 2, width: 1, action(self, _) { self.gotoPage("amountOther"); } },
	{ name: "FIELD", row: -0.5, col: 1, width: 3.2, action(_, __) {} },
	{ name: "1", row: 1, col: 0, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "2", row: 1, col: 1, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "3", row: 1, col: 2, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "4", row: 2, col: 0, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "5", row: 2, col: 1, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "6", row: 2, col: 2, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "7", row: 3, col: 0, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "8", row: 3, col: 1, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "9", row: 3, col: 2, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "+", row: 4, col: 0, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "0", row: 4, col: 1, width: 1, action(self, _) { self.numberButton(this); } },
	{ name: "<-", row: 4, col: 2, width: 1, action(self, _) { self.backspaceButton(); } },
	{ name: "Ok", row: 5, col: 1.75, width: 1.5, action(self) { self.okButton(); } },
	{ name: "Back", row: 5, col: 0.25, width: 1.5, action(self, _) { self.backButton(); } },
	{ name: "Reset", row: 2, col: 1, width: 2, action(self, _) { self.resetButton(); } },
	{ name: "Fill out a Connect card", row: 0, col: 2.4, width: 5, action(_, __) {} },
	{ name: "Connect to our Discord server", row: 1.5, col: 2.4, width: 5, action(_, __) {} },
	{ name: "Support the ministry", row: 3, col: 2.4, width: 5, action(self, user) { self.startGiving(user) } },
];

const keypad: ButtonName[] = ["FIELD", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "<-", "Back", "Ok"];

const pages: { [key: string]: Page } = {
	start: {
		title: "Welcome to $ChurchName",
		blurb: "",
		buttons: [
			"Fill out a Connect card",
			"Connect to our Discord server",
			"Support the ministry",
		],
		init: (self) => {
			self.amount = 0;
			self.user = null;
			self.fieldValue = "";
			self.mobile = "+01";
		},
	},
	// fund: {
	// title: "Select Fund"|
	// blurb: "...",
	// buttons: ["$5", "$10", "$20", "$50", "$100", "Other"],
	// },
	amount: {
		title: "Select Amount to Pledge",
		blurb: 
			"Hi $User!\n\nIf you would like to make a gift\nto our community please select\nan amount and press next.",
		buttons: ["$5", "$10", "$20", "$50", "$100", "Other", "Reset"],
		init(self) {
			self.mobile = self.getCachedMobile();
			self.amount = 0;
			self.fieldValue = "";
		},
	},
	amountOther: {
		title: "Enter Amount to Pledge",
		blurb: 
			"Hi $User!\n\nIf you would like to make a gift\nto our community please enter\nan amount and press next.",
		buttons: keypad,
		init(self) {
			self.fieldValue = self.amount.toFixed(0);
		},
	},
	mobile: {
		title: "Real world contact",
		blurb: 
			// eslint-disable-next-line max-len
			"You have elected to pledge:\n        $$Amount\n\nPlease enter your mobile\nnumber where we will send\nyour unique giving link.",
		buttons: [...keypad, "+"],
		init(self) {
			self.amount = +self.fieldValue;
			self.fieldValue = self.mobile;
		},
	},
	thanks: {
		title: "Thanks for your Pledge, $User",
		blurb: 
			// eslint-disable-next-line max-len
			"We will send the pledge link\nfor $$Amount to:\n        $Mobile\n\nYour generous gift\nmakes a difference\nto all those people that\nour church supports.",
		buttons: ["Reset"],
		init(self) {
			self.mobile = self.fieldValue;
			cache[self.user.id.toString()] = self.mobile;
		},
	},
};

type PageName = keyof typeof pages;

const titleTextColour: MRE.Color4Like = { r: 1, g: 1, b: 1, a: 1 };
const blurbTextColour: MRE.Color4Like = { r: 1, g: 1, b: 1, a: 0.575 };
const buttonTextColour: MRE.Color4Like = { r: 1, g: 1, b: 1, a: 1 };

const innerBoxColour: MRE.Color4Like = { r: 30/255, g: 40/255, b: 81/255, a: 0.7 };
const outerBoxColour: MRE.Color3Like = { r: 30/255, g: 40/255, b: 81/255 };

const SCALE = 0.3;

const floorScale = 2;
const screenScale = 3;
const screenAspect = 2;
const zDelta = -SCALE / 3;

const buttonGrid = {
	x: -SCALE * screenAspect * screenScale * 0.4,
	y: SCALE * screenScale * 0.2,
	dx: SCALE * 1,
	dy: -SCALE * 0.3,
};
const buttonHeight = buttonGrid.dx * 0.9 * 2;
const buttonRadius = -buttonGrid.dy * 0.4;

/**
 * The main class of this app. All the logic goes here.
 */
export default class VRGiving {
	amount = 0;
	mobile = "+01";

	private _fieldText = "";
	get fieldValue(): string {
		return this._fieldText;
	}
	set fieldValue(value: string) {
		this._fieldText = value;
		this.text["FIELD"].text.contents = this.fieldValue;
	}

	user: MRE.User;

	private floor: MRE.Actor = null;
	private box: MRE.Actor = null;
	private screen: MRE.Actor = null;
	private buttonMeshes: { [key: number]: MRE.Mesh } = {};
	private buttons: { [key: string]: MRE.Actor } = {};
	private text: { [key: string]: MRE.Actor } = {};

	private assets: MRE.AssetContainer;

	private currentPage: Page;

	constructor(private context: MRE.Context) {
		// set up somewhere to store loaded assets (meshes, textures, animations, gltfs, etc.)
		this.assets = new MRE.AssetContainer(context);
		this.context.onStarted(() => this.started());
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private async started() {
		// Check whether code is running in a debuggable watched filesystem
		// environment and if so delay starting the app by 1 second to give
		// the debugger time to detect that the server has restarted and reconnect.
		// The delay value below is in milliseconds so 1000 is a one second delay.
		// You may need to increase the delay or be able to decrease it depending
		// on the speed of your PC.
		const delay = 1000;
		const argv = process.execArgv.join();
		const isDebug = argv.includes("inspect") || argv.includes("debug");
		// // version to use with non-async code
		// if (isDebug) {
		// setTimeout(this.startedImpl, delay);
		// } else {
		// this.startedImpl();
		// }
		// version to use with async code
		if (isDebug) {
			await new Promise((resolve) => setTimeout(resolve, delay));
			await this.startedImpl();
		} else {
			await this.startedImpl();
		}
	}

	// use () => {} syntax here to get proper scope binding when called via setTimeout()
	// if async is required, next line becomes private startedImpl = async () => {
	private startedImpl = async () => {
		const cubeData = await this.assets.loadGltf("altspace-cube.glb", "box");

		this.createFloor();
		this.createScreen();
		this.createButtons();

		this.gotoPage("start");
	};

	getCachedMobile() {
		if (this.user) {
			this.mobile = cache[this.user.id.toString()] ?? "+01";
			return cache[this.user.id.toString()] = this.mobile;
		}

		return null;
	}

	private createScreen() {
		const material = this.assets.createMaterial("boxMat", {
			color: { r: 0.4, g: 0.4, b: 0.4, a: 1 },
			alphaMode: MRE.AlphaMode.Blend,
		});

		this.screen = MRE.Actor.CreatePrimitive(this.assets, {
			actor: {
				name: "Screen",
				transform: {
					app: { position: { x: 0, y: SCALE * 5, z: 0 } },
				},
				appearance: {
					// materialId: material.id,
				},
			},
			addCollider: true,
			definition: {
				shape: MRE.PrimitiveShape.Box,
				dimensions: {
					x: SCALE * screenAspect * screenScale,
					y: SCALE * screenScale,
					z: SCALE / 2,
				},
			},
		});
		this.text["title"] = MRE.Actor.Create(this.context, {
			actor: {
				name: "Title",
				parentId: this.screen.id,
				transform: {
					local: {
						position: {
							x: 0,
							y: SCALE * screenScale * 0.45,
							z: zDelta,
						},
					},
				},
				text: {
					contents: "",
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: titleTextColour,
					height: 0.1,
				},
			},
		});
		this.text["blurb"] = MRE.Actor.Create(this.context, {
			actor: {
				name: "Blurb",
				parentId: this.screen.id,
				transform: {
					local: {
						position: {
							x: SCALE / 3,
							y: SCALE * screenScale * 0.3,
							z: zDelta,
						},
					},
				},
				text: {
					contents: "",
					anchor: MRE.TextAnchorLocation.TopLeft,
					color: blurbTextColour,
					height: 0.05,
				},
			},
		});
	}

	private createFloor() {
		const floorTex = this.assets.createTexture("floorTex", {
			uri: "PushpayGlow.png",
			resolution: { x: 1500, y: 1500 },
		});
		const floorMat = this.assets.createMaterial("floorMat", {
			mainTextureId: floorTex.id,
			alphaMode: MRE.AlphaMode.Blend,
		});

		this.floor = MRE.Actor.CreatePrimitive(this.assets, {
			actor: {
				name: "Floor",
				transform: {
					app: { position: { x: 0, y: 0, z: -SCALE * 4 } },
				},
				appearance: {
					materialId: floorMat.id,
				},
			},
			addCollider: true,
			definition: {
				shape: MRE.PrimitiveShape.Plane,
				dimensions: {
					x: SCALE * 2 * floorScale,
					y: SCALE / 20,
					z: SCALE * 2 * floorScale,
				},
			},
		});

		//NOTE: not sure how to make a walk-into-it-triggered button:
		// const floorButton = this.floor.setBehavior(MRE.ButtonBehavior);

		{
			const innerMaterial = this.assets.createMaterial("boxInnerMat", {
				color: innerBoxColour,
				alphaMode: MRE.AlphaMode.Blend,
			});
			const outerMaterial = this.assets.createMaterial("boxOuterMat", {
				color: outerBoxColour,
			});

			this.box = MRE.Actor.CreatePrimitive(this.assets, {
				actor: {
					name: "BoxOuter",
					transform: {
						app: {
							position: { x: 0, y: SCALE * 4, z: -SCALE * 2 },
						},
					},
					appearance: {
						materialId: outerMaterial.id,
					},
				},
				addCollider: true,
				definition: {
					shape: MRE.PrimitiveShape.Box,
					dimensions: {
						x: SCALE * 3.5 * floorScale,
						y: SCALE * 10,
						z: SCALE * 4.5 * floorScale,
					},
				},
			});

			MRE.Actor.CreatePrimitive(this.assets, {
				actor: {
					name: "BoxE",
					parentId: this.box.id,
					transform: {
						local: {
							position: {
								x: SCALE * 2 * floorScale - 0.255,
								y: 0,
								z: 0,
							},
						},
					},
					appearance: {
						materialId: innerMaterial.id,
					},
				},
				addCollider: true,
				definition: {
					shape: MRE.PrimitiveShape.Box,
					dimensions: {
						x: 0.1,
						y: SCALE * 10,
						z: SCALE * 4 * floorScale,
					},
				},
			});
			MRE.Actor.CreatePrimitive(this.assets, {
				actor: {
					name: "BoxW",
					parentId: this.box.id,
					transform: {
						local: {
							position: {
								x: -SCALE * 2 * floorScale + 0.255,
								y: 0,
								z: 0,
							},
						},
					},
					appearance: {
						materialId: innerMaterial.id,
					},
				},
				addCollider: true,
				definition: {
					shape: MRE.PrimitiveShape.Box,
					dimensions: {
						x: 0.1,
						y: SCALE * 10,
						z: SCALE * 4 * floorScale,
					},
				},
			});
			MRE.Actor.CreatePrimitive(this.assets, {
				actor: {
					name: "BoxS",
					parentId: this.box.id,
					transform: {
						local: {
							position: {
								x: 0,
								y: 0,
								z: -SCALE * 2 * floorScale + 0.255 - SCALE,
							},
						},
					},
					appearance: {
						materialId: innerMaterial.id,
					},
				},
				addCollider: true,
				definition: {
					shape: MRE.PrimitiveShape.Box,
					dimensions: {
						x: SCALE * 4 * floorScale - 0.5,
						y: SCALE * 10,
						z: 0.1,
					},
				},
			});
			MRE.Actor.CreatePrimitive(this.assets, {
				actor: {
					name: "BoxN",
					parentId: this.box.id,
					transform: {
						local: {
							position: {
								x: 0,
								y: 0,
								z: SCALE * 2 * floorScale + 0.255 - SCALE,
							},
						},
					},
					appearance: {
						materialId: innerMaterial.id,
					},
				},
				addCollider: true,
				definition: {
					shape: MRE.PrimitiveShape.Box,
					dimensions: {
						x: SCALE * 4 * floorScale - 0.5,
						y: SCALE * 10,
						z: 0.1,
					},
				},
			});
			MRE.Actor.CreatePrimitive(this.assets, {
				actor: {
					name: "BoxT",
					parentId: this.box.id,
					transform: {
						local: {
							position: {
								x: 0,
								y: SCALE * 5,
								z: SCALE * floorScale - 0.35 - SCALE,
							},
						},
					},
					appearance: {
						materialId: innerMaterial.id,
					},
				},
				addCollider: true,
				definition: {
					shape: MRE.PrimitiveShape.Box,
					dimensions: {
						x: SCALE * 4 * floorScale - 0.5,
						y: 0.1,
						z: SCALE * 4 * floorScale,
					},
				},
			});
		}
	}

	amountButton(button: ButtonDef) {
		this.fieldValue = button.name.slice(1);
		this.gotoPage("mobile");
	}

	numberButton(button: ButtonDef) {
		if (this.currentPage === pages["amountOther"]) {
			this.amount *= 10;
			this.amount += +button.name;
			this.fieldValue = this.amount.toFixed(0);
		} else {
			this.fieldValue += button.name;
		}
	}

	backspaceButton() {
		if (!this.fieldValue) { return; }

		if (this.currentPage === pages["amountOther"]) {
			this.amount = Math.floor(this.amount / 10);
			this.fieldValue = this.amount.toFixed(0);
		} else {
			this.fieldValue = this.fieldValue.substring(
				0,
				this.fieldValue.length - 1
			);
		}
	}

	okButton() {
		if (this.currentPage === pages["amountOther"]) {
			if (this.amount) {
				this.gotoPage("mobile");
			}
		} else {
			this.gotoPage("thanks");
		}
	}

	backButton() {
		this.gotoPage("amount");
	}

	startGiving(user: MRE.User) {
		this.user = user;
		this.gotoPage("amount");
	}

	resetButton() {
		this.gotoPage("start");
	}

	private templateText(str: string) {
		return str
			.replace("$Amount", this.amount.toFixed(0))
			.replace("$User", this.user?.name)
			.replace("$Mobile", this.mobile);
	}

	gotoPage(page: PageName) {
		this.currentPage = pages[page];

		for (const buttonName in this.buttons) {
			const enabled = this.currentPage.buttons.includes(
				buttonName as ButtonName
			);
			const button = this.buttons[buttonName];
			button.collider.enabled = enabled;
			button.appearance.enabled = enabled;
			this.text[buttonName].appearance.enabled = enabled;
		}

		this.currentPage.init(this);

		this.text["title"].text.contents = this.templateText(
			this.currentPage.title
		);
		this.text["blurb"].text.contents = this.templateText(
			this.currentPage.blurb
		);

		const showBox = !!this.user;
		this.box.collider.enabled = showBox;
		this.box.appearance.enabled = showBox;
	}

	private createButtons() {
		const widths = _.chain(buttonDefs)
			.map((b) => b.width)
			.uniq()
			.sort()
			.value();

		for (const width of widths) {
			this.buttonMeshes[width] = this.assets.createCapsuleMesh(
				`buttonMesh${width}`,
				buttonHeight * width,
				buttonRadius,
				"x",
				32
			);
		}

		for (const def of buttonDefs) {
			const { buttonActor, buttonText } = this.createButton(def);
			this.buttons[def.name] = buttonActor;
			this.text[def.name] = buttonText;
		}
	}

	/** Creates a button given the text and offset and adds both to respective collections */
	private createButton(buttonDef: ButtonDef) {
		const buttonPosition = {
			x: buttonGrid.x + buttonGrid.dx * buttonDef.col,
			y: buttonGrid.y + buttonGrid.dy * buttonDef.row,
			z: zDelta * 0.75,
		};

		const buttonActor = MRE.Actor.Create(this.context, {
			actor: {
				name: `Button:${buttonDef.name}`,
				parentId: this.screen.id,
				appearance: { meshId: this.buttonMeshes[buttonDef.width].id },
				transform: {
					local: {
						position: buttonPosition,
						scale: { x: 0.5, y: 1, z: 0.5 },
					},
				},
			},
		});
		buttonActor.setCollider(MRE.ColliderType.Box, false);

		const buttonText = MRE.Actor.Create(this.context, {
			actor: {
				name: `ButtonText:${buttonDef.name}`,
				parentId: buttonActor.id,
				transform: {
					local: {
						position: { x: 0, y: 0, z: zDelta / 2 },
						scale: { x: 2, y: 1, z: 1 },
					},
				},
				text: {
					contents: buttonDef.name,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: buttonTextColour,
					height: buttonHeight * 0.05,
					font: MRE.TextFontFamily.Monospace,
				},
			},
		});

		const buttonBehavior = buttonActor.setBehavior(MRE.ButtonBehavior);
		buttonBehavior.onHover("enter", (_) => {
			MRE.Animation.AnimateTo(this.context, buttonActor, {
				destination: {
					transform: { local: { scale: { x: 0.5, y: 1, z: 1 } } },
				},
				duration: 0.1,
				easing: MRE.AnimationEaseCurves.EaseOutSine,
			});
		});
		buttonBehavior.onHover("exit", (_) => {
			MRE.Animation.AnimateTo(this.context, buttonActor, {
				destination: {
					transform: { local: { scale: { x: 0.5, y: 1, z: 0.5 } } },
				},
				duration: 0.2,
				easing: MRE.AnimationEaseCurves.EaseOutSine,
			});
		});
		buttonBehavior.onClick((user) => {
			buttonDef.action(this, user);
		});

		return { buttonActor, buttonText };
	}
}
